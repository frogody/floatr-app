'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,  
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  profileImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  role: z.enum(['CAPTAIN', 'CREW'], {
    required_error: 'Please select your role',
  }),
  interests: z.array(z.string()).optional(),
  // Emergency Contact Information (for SOS alerts)
  emergencyContactName: z.string().min(2, 'Emergency contact name must be at least 2 characters').optional(),
  emergencyContactPhone: z.string().min(10, 'Please enter a valid phone number').optional(),
  emergencyContactRelation: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData?: any;
  userRole?: string;
  hasProfile: boolean;
}

const commonInterests = [
  'Sailing', 'Fishing', 'Swimming', 'Snorkeling', 'Diving', 'Water Sports',
  'Sunset Cruises', 'Island Hopping', 'Photography', 'Music', 'Dancing',
  'Cooking', 'Wine Tasting', 'Adventure', 'Relaxation', 'Socializing'
];

export function ProfileForm({ initialData, userRole, hasProfile }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    initialData?.interests || []
  );

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      dateOfBirth: initialData?.dateOfBirth 
        ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] 
        : '',
      bio: initialData?.bio || '',
      profileImage: initialData?.profileImage || '',
      role: (userRole as 'CAPTAIN' | 'CREW') || 'CREW',
      interests: initialData?.interests || [],
      emergencyContactName: initialData?.emergencyContactName || '',
      emergencyContactPhone: initialData?.emergencyContactPhone || '',
      emergencyContactRelation: initialData?.emergencyContactRelation || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    
    try {
      const payload = {
        ...data,
        interests: selectedInterests,
      };

      const response = await fetch('/api/profile', {
        method: hasProfile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      // Success - redirect or show success message
      router.refresh();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      // You might want to show an error toast here
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                You must be at least 18 years old to use Floatr
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CREW">Crew Member</SelectItem>
                  <SelectItem value="CAPTAIN">Boat Captain</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Captains can create boat profiles and invite crew members
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell others about yourself..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Share what makes you a great sailing companion
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profileImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Image URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://example.com/your-photo.jpg"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add a URL to your profile photo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Interests */}
        <div className="space-y-3">
          <Label>Interests (Optional)</Label>
          <p className="text-sm text-muted-foreground">
            Select your interests to help others find you
          </p>
          <div className="flex flex-wrap gap-2">
            {commonInterests.map((interest) => (
              <Badge
                key={interest}
                variant={selectedInterests.includes(interest) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </div>
          {selectedInterests.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">Selected interests:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedInterests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contact Section */}
        <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-red-800">🚨 Emergency Contact</h3>
            <Badge variant="destructive" className="text-xs">Required for SOS</Badge>
          </div>
          <p className="text-sm text-red-700">
            This person will be contacted in case of an emergency SOS alert. 
            Make sure they know they're your emergency contact.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-red-800">Emergency Contact Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Full name"
                      className="bg-white border-red-200"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-red-600">
                    Required for SOS emergency alerts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-red-800">Emergency Contact Phone</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      className="bg-white border-red-200"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-red-600">
                    Include country code (e.g., +1 for US)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContactRelation"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-red-800">Relationship</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Spouse, Parent, Sibling, Friend"
                      className="bg-white border-red-200"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-red-600">
                    How is this person related to you?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}
        </Button>
      </form>
    </Form>
  );
} 