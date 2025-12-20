import { Server } from 'socket.io';

let io: Server | null = null;

export const setIo = (instance: Server) => {
    io = instance;
};

export const getIo = () => {
    if (!io) {
        console.warn("Socket.IO instance not initialized!");
    }
    return io;
};

export const emitMachineUpdate = (machineId: string, data: any) => {
    if (io) {
        io.to(`machine:${machineId}`).emit('machine:update', data);
    }
};

export const emitUserUpdate = (userId: string, data: any) => {
    if (io) {
        io.to(`user:${userId}`).emit('user:update', data);
    }
};

export const emitSessionUpdate = (data: any) => {
    if (io) {
        io.to('all-sessions').emit('session:update', data);
    }
};
