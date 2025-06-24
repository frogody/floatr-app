import { NextRequest } from 'next/server';
import { Server } from 'socket.io';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// Global variable to store the Socket.IO server instance
let io: Server | undefined;

export async function GET(request: NextRequest) {
  if (!io) {
    // Create Socket.IO server
    const httpServer = (global as any).socketServer;
    io = new Server(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    io.on('connection', async (socket) => {
      console.log('User connected:', socket.id);

      // Handle joining a chat room
      socket.on('join-chat', async (data: { matchId: string; userId: string }) => {
        try {
          const { matchId, userId } = data;
          
          // Verify user has access to this match
          const match = await prisma.match.findFirst({
            where: {
              id: matchId,
              status: 'MATCHED',
              OR: [
                { likerBoat: { captainId: userId } },
                { likedBoat: { captainId: userId } },
              ],
            },
            include: {
              likerBoat: true,
              likedBoat: true,
              chatRoom: true,
            },
          });

          if (!match) {
            socket.emit('error', { message: 'Unauthorized access to chat' });
            return;
          }

          // Join the socket room for this match
          socket.join(`match:${matchId}`);
          
          // Store user and match info in socket data
          socket.data = {
            userId,
            matchId,
            boatId: match.likerBoat.captainId === userId ? match.likerBoatId : match.likedBoatId,
          };

          socket.emit('joined-chat', { matchId, success: true });
          console.log(`User ${userId} joined chat for match ${matchId}`);

        } catch (error) {
          console.error('Error joining chat:', error);
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      // Handle sending a message
      socket.on('send-message', async (data: { 
        matchId: string; 
        content: string; 
        messageType?: string 
      }) => {
        try {
          const { matchId, content, messageType = 'TEXT' } = data;
          const { userId, boatId } = socket.data;

          if (!userId || !matchId || !content.trim()) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
          }

          // Get or create chat room
          let chatRoom = await prisma.chatRoom.findUnique({
            where: { matchId },
            include: { match: true },
          });

          if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
              data: {
                matchId,
                participants: [socket.data.boatId],
                isActive: true,
              },
              include: { match: true },
            });
          }

          // Create the message
          const message = await prisma.message.create({
            data: {
              chatRoomId: chatRoom.id,
              senderId: userId,
              content: content.trim(),
              messageType: messageType as any,
              readBy: [boatId], // Sender has automatically read their own message
            },
            include: {
              sender: {
                include: {
                  profile: true,
                },
              },
            },
          });

          // Update chat room's last message timestamp
          await prisma.chatRoom.update({
            where: { id: chatRoom.id },
            data: { lastMessageAt: new Date() },
          });

          // Prepare message data for real-time broadcast
          const messageData = {
            id: message.id,
            content: message.content,
            messageType: message.messageType,
            createdAt: message.createdAt,
            senderId: message.senderId,
            sender: {
              firstName: message.sender.profile?.firstName,
              lastName: message.sender.profile?.lastName,
              profileImage: message.sender.profile?.profileImage,
            },
            readBy: message.readBy,
          };

          // Broadcast to all users in the match room
          io?.to(`match:${matchId}`).emit('new-message', messageData);

          console.log(`Message sent in match ${matchId} by user ${userId}`);

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle message read receipts
      socket.on('mark-read', async (data: { matchId: string; messageId: string }) => {
        try {
          const { matchId, messageId } = data;
          const { userId, boatId } = socket.data;

          if (!userId || !matchId || !messageId) {
            return;
          }

          // Update message read status
          await prisma.message.update({
            where: { id: messageId },
            data: {
              readBy: {
                push: boatId,
              },
            },
          });

          // Notify other users in the chat
          socket.to(`match:${matchId}`).emit('message-read', {
            messageId,
            readBy: boatId,
          });

        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing', (data: { matchId: string; isTyping: boolean }) => {
        const { matchId, isTyping } = data;
        const { userId } = socket.data;

        if (userId && matchId) {
          socket.to(`match:${matchId}`).emit('user-typing', {
            userId,
            isTyping,
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  return new Response('WebSocket server initialized', { status: 200 });
}

// Export the Socket.IO instance for use in other API routes
export { io }; 