import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MapContainer } from './components/MapContainer';

export default async function MapPage() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  return (
    <div className="h-screen w-full">
      {/* Full-screen map container */}
      <MapContainer />
    </div>
  );
} 