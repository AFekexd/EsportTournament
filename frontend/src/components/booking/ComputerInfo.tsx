import { Cpu, HardDrive, Monitor, Gamepad2, Info } from 'lucide-react';
import type { Computer } from '../../store/slices/bookingsSlice';

interface ComputerInfoProps {
    computer: Computer;
}

export function ComputerInfo({ computer }: ComputerInfoProps) {
    if (!computer.specs && (!computer.installedGames || computer.installedGames.length === 0)) {
        return (
            <div className="flex items-center gap-2 p-4 text-muted-foreground italic text-sm">
                <Info size={16} />
                <span>Nincsenek részletes információk erről a gépről.</span>
            </div>
        );
    }

    return (
        <div className="bg-secondary rounded-md p-4 text-foreground border border-border">
            <h4 className="text-base font-semibold mb-4 text-primary border-b border-border pb-2">Részletes specifikáció</h4>

            {computer.specs && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
                    <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-sm">
                        <Cpu size={18} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Processzor (CPU)</span>
                            <span className="font-medium text-sm">{computer.specs.cpu || '-'}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-sm">
                        <Cpu size={18} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Videókártya (GPU)</span>
                            <span className="font-medium text-sm">{computer.specs.gpu || '-'}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-sm">
                        <HardDrive size={18} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Memória (RAM)</span>
                            <span className="font-medium text-sm">{computer.specs.ram || '-'}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-sm">
                        <Monitor size={18} className="text-primary mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Monitor</span>
                            <span className="font-medium text-sm">{computer.specs.monitor || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {computer.installedGames && computer.installedGames.length > 0 && (
                <div className="mt-4">
                    <h5 className="flex items-center gap-2 text-sm font-semibold mb-3 text-secondary-foreground">
                        <Gamepad2 size={16} />
                        Telepített játékok
                    </h5>
                    <div className="flex flex-wrap gap-2">
                        {computer.installedGames.map((game, index) => (
                            <span key={index} className="bg-primary/15 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                                {game}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
