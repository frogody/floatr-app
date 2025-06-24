import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatInterface } from './components/ChatInterface';

interface PageProps {
  params: Promise<{ matchId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect('/sign-in');
  }

  const { matchId } = await params;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ChatInterface matchId={matchId} />
    </div>
  );
} 