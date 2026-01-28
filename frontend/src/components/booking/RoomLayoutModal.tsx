import React, { useRef, useEffect, useState } from "react";
import { X, Map } from "lucide-react";
import type { Computer } from "../../store/slices/bookingsSlice";

interface RoomLayoutModalProps {
    computers: Computer[];
    isOpen: boolean;
    onClose: () => void;
}

export const RoomLayoutModal: React.FC<RoomLayoutModalProps> = ({
    computers,
    isOpen,
    onClose,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom and Pan State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const lastDist = useRef<number | null>(null);

    // Reset zoom when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [isOpen]);

    // Touch/Pointer Events for Pan & Zoom
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e && e.touches.length === 2) {
            // Pinch Start
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastDist.current = dist;
        } else {
            // Pan Start
            setIsDragging(true);
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            lastPos.current = { x: clientX - position.x, y: clientY - position.y };
        }
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if ('touches' in e && e.touches.length === 2 && lastDist.current) {
            // Pinch Zoom
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist - lastDist.current;
            const newScale = Math.min(Math.max(scale + delta * 0.01, 1), 4);
            setScale(newScale);
            lastDist.current = dist;
            return;
        }

        if (isDragging) {
            // Pan
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            setPosition({
                x: clientX - lastPos.current.x,
                y: clientY - lastPos.current.y
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        lastDist.current = null;
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(scale + delta, 1), 4);
        setScale(newScale);
    };

    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set fixed high resolution for zooming
        canvas.width = 1600; // 800 * 2
        canvas.height = 800; // 400 * 2
        ctx.scale(2, 2); // Scale context to match default 800x400 coordinate system

        // Clear canvas
        ctx.clearRect(0, 0, 800, 400);

        const padding = 40;
        const roomWidth = 800 - padding * 2;
        const roomHeight = 400 - padding * 2;
        const wallThickness = 4;

        // Draw Room Walls
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = wallThickness;
        ctx.strokeRect(padding, padding, roomWidth, roomHeight);

        // Draw Door (Right wall, centered vertically-ish)
        const doorHeight = 60;
        const doorY = padding + roomHeight / 2 - doorHeight / 2;
        // Clear wall for door
        ctx.clearRect(padding + roomWidth - wallThickness / 2, doorY, wallThickness, doorHeight);

        // Draw door rect
        ctx.strokeStyle = "#8b5cf6"; // Primary color
        ctx.lineWidth = 2;
        ctx.strokeRect(padding + roomWidth, doorY, 15, doorHeight);

        // Draw "Bejárat" text
        ctx.fillStyle = "#9ca3af";
        ctx.font = "10px Inter";
        ctx.save();
        ctx.translate(padding + roomWidth + 25, doorY + doorHeight / 2);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = "center";
        ctx.fillText("BEJÁRAT", 0, 0);
        ctx.restore();

        // Draw Computers
        const row0 = computers.filter(c => c.row === 0).sort((a, b) => b.position - a.position);
        const row1 = computers.filter(c => c.row === 1).sort((a, b) => b.position - a.position);

        const compSize = 50;
        const gap = 15;

        const drawComputer = (comp: Computer, x: number, y: number) => {
            // Computer box
            ctx.fillStyle = comp.isCompetitionMode ? "rgba(234, 179, 8, 0.2)" : "rgba(139, 92, 246, 0.2)";
            ctx.strokeStyle = comp.isCompetitionMode ? "#eab308" : "#8b5cf6";
            ctx.lineWidth = 2;

            ctx.fillRect(x, y, compSize, compSize);
            ctx.strokeRect(x, y, compSize, compSize);

            // Screen 'glow'
            ctx.shadowColor = comp.isCompetitionMode ? "#eab308" : "#8b5cf6";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fillRect(x + 5, y + 5, compSize - 10, 10);
            ctx.shadowBlur = 0;

            // Name
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px Inter";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(comp.name, x + compSize / 2, y + compSize / 2 + 5);
        };

        // Draw Row 1 (Top) - Computers 7+
        const row1Width = row1.length * compSize + (row1.length - 1) * gap;
        const startX1 = padding + (roomWidth - row1Width) / 2;

        row1.forEach((comp, i) => {
            const x = startX1 + i * (compSize + gap);
            const y = padding + 20; // 20px from top wall
            drawComputer(comp, x, y);
        });

        // Draw Row 0 (Bottom) - Computers 1-6
        const row0Width = row0.length * compSize + (row0.length - 1) * gap;
        const startX0 = padding + (roomWidth - row0Width) / 2; // Center horizontally

        row0.forEach((comp, i) => {
            const x = startX0 + i * (compSize + gap);
            const y = padding + roomHeight - compSize - 20; // 20px from bottom wall
            drawComputer(comp, x, y);
        });

    }, [isOpen, computers]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f1015] flex-shrink-0 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Map className="text-primary" />
                        Terem elrendezés (beta)
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 relative overflow-hidden bg-[#0f1015] touch-none cursor-grab active:cursor-grabbing min-h-[50vh] w-full"
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    <div
                        className="absolute top-1/2 left-1/2 origin-center transition-transform duration-75 ease-linear w-[800px] h-[400px]"
                        style={{
                            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full border border-white/5 rounded-xl bg-[#1a1b26] shadow-2xl"
                            width={1600}
                            height={800}
                        />

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 bg-black/50 p-3 rounded-lg border border-white/10 backdrop-blur-md pointer-events-none" style={{ transform: `scale(${1 / scale})`, transformOrigin: 'bottom left' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 bg-primary/20 border border-primary"></div>
                                <span className="text-xs text-gray-300">Normál gép</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500/20 border border-yellow-500"></div>
                                <span className="text-xs text-gray-300">Verseny gép</span>
                            </div>
                        </div>
                    </div>

                    {/* Beta Controls for debugging/desktop */}
                    <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                        <button onClick={() => setScale(s => Math.min(s + 0.5, 4))} className="bg-black/50 p-2 rounded text-white">+</button>
                        <button onClick={() => setScale(s => Math.max(s - 0.5, 1))} className="bg-black/50 p-2 rounded text-white">-</button>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-[#1a1b26] text-center text-sm text-gray-400 flex-shrink-0 z-10 transition-colors">
                    {scale === 1 ? "Használd a kétujjas nagyítást a részletekért." : "Mozgasd az ujjad a térképen a nézet váltásához."}
                </div>
            </div>
        </div>
    );
};
