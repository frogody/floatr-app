import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
const UserRole = {
  CAPTAIN: 'CAPTAIN',
  CREW: 'CREW'
} as const;

interface CreateProfileRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  role?: 'CAPTAIN' | 'CREW';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  role?: 'CAPTAIN' | 'CREW';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

// GET - Retrieve user profile
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        profile: {
          include: {
            emergencyContacts: true,
          },
        },
        ownedBoats: true,
        verificationData: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user,
        hasProfile: !!user.profile,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
      },
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update user profile
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: 'User not found in Clerk' },
        { status: 404 }
      );
    }

    const body: CreateProfileRequest = await request.json();
    const {
      firstName,
      lastName,
      dateOfBirth,
      bio,
      interests = [],
      profileImage,
      role = 'CREW',
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
    } = body;

    // Validation
    if (!firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, dateOfBirth' },
        { status: 400 }
      );
    }

    // Parse and validate date of birth
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for dateOfBirth' },
        { status: 400 }
      );
    }

    // Check age requirement (18+)
    const age = new Date().getFullYear() - dobDate.getFullYear();
    if (age < 18) {
      return NextResponse.json(
        { error: 'Must be at least 18 years old' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    });

    if (user && user.profile) {
      // Update existing profile
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: role as keyof typeof UserRole,
          email: clerkUser.primaryEmailAddress?.emailAddress || user.email,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelation,
          profile: {
            update: {
              firstName,
              lastName,
              dateOfBirth: dobDate,
              bio,
              interests,
              profileImage,
            },
          },
        },
        include: {
          profile: {
            include: {
              emergencyContacts: true,
            },
          },
          ownedBoats: true,
        },
      });

      // Log profile update
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'profile_updated',
          resourceType: 'UserProfile',
          resourceId: user.profile.id,
          details: { updatedFields: Object.keys(body) },
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } else {
      // Create new user and profile
      const newUser = await prisma.user.create({
        data: {
          clerkId,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          role: role as keyof typeof UserRole,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelation,
          profile: {
            create: {
              firstName,
              lastName,
              dateOfBirth: dobDate,
              bio,
              interests,
              profileImage,
            },
          },
          discoverySettings: {
            create: {
              maxDistance: 25,
              preferredVibes: ['CHILL'],
              ageRangeMin: 18,
              ageRangeMax: 65,
              preferredBoatTypes: ['SAILBOAT', 'MOTORBOAT', 'YACHT'],
              isDiscoverable: true,
            },
          },
        },
        include: {
          profile: {
            include: {
              emergencyContacts: true,
            },
          },
          discoverySettings: true,
          ownedBoats: true,
        },
      });

      // Log profile creation
      await prisma.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'profile_created',
          resourceType: 'UserProfile',
          resourceId: newUser.profile!.id,
          details: { clerkId, role },
        },
      });

      return NextResponse.json({
        success: true,
        data: newUser,
        message: 'Profile created successfully',
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Error creating/updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update existing profile
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateProfileRequest = await request.json();

    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.dateOfBirth !== undefined) {
      const dobDate = new Date(body.dateOfBirth);
      if (isNaN(dobDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format for dateOfBirth' },
          { status: 400 }
        );
      }
      updateData.dateOfBirth = dobDate;
    }
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.interests !== undefined) updateData.interests = body.interests;
    if (body.profileImage !== undefined) updateData.profileImage = body.profileImage;

    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.role && { role: body.role as keyof typeof UserRole }),
        ...(body.emergencyContactName !== undefined && { emergencyContactName: body.emergencyContactName }),
        ...(body.emergencyContactPhone !== undefined && { emergencyContactPhone: body.emergencyContactPhone }),
        ...(body.emergencyContactRelation !== undefined && { emergencyContactRelation: body.emergencyContactRelation }),
        profile: {
          update: updateData,
        },
      },
      include: {
        profile: {
          include: {
            emergencyContacts: true,
          },
        },
        ownedBoats: true,
      },
    });

    // Log update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'profile_updated',
        resourceType: 'UserProfile',
        resourceId: user.profile.id,
        details: { updatedFields: Object.keys(body) },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 