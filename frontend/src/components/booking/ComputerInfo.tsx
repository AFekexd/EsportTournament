import { Cpu, HardDrive, Monitor, Gamepad2, Info } from 'lucide-react';
import type { Computer } from '../../store/slices/bookingsSlice';
import './ComputerInfo.css';

interface ComputerInfoProps {
    computer: Computer;
}

export function ComputerInfo({ computer }: ComputerInfoProps) {
    if (!computer.specs && (!computer.installedGames || computer.installedGames.length === 0)) {
        return (
            <div className="computer-info-empty">
                <Info size={16} />
                <span>Nincsenek részletes információk erről a gépről.</span>
            </div>
        );
    }

    return (
        <div className="computer-info-panel">
            <h4 className="computer-info-title">Részletes specifikáció</h4>

            {computer.specs && (
                <div className="specs-grid">
                    <div className="spec-item">
                        <Cpu size={18} />
                        <div className="spec-details">
                            <span className="spec-label">Processzor (CPU)</span>
                            <span className="spec-value">{computer.specs.cpu || '-'}</span>
                        </div>
                    </div>

                    <div className="spec-item">
                        <div className="gpu-icon-wrapper">
                            <Cpu size={18} className="gpu-icon" />
                        </div>
                        <div className="spec-details">
                            <span className="spec-label">Videókártya (GPU)</span>
                            <span className="spec-value">{computer.specs.gpu || '-'}</span>
                        </div>
                    </div>

                    <div className="spec-item">
                        <HardDrive size={18} />
                        <div className="spec-details">
                            <span className="spec-label">Memória (RAM)</span>
                            <span className="spec-value">{computer.specs.ram || '-'}</span>
                        </div>
                    </div>

                    <div className="spec-item">
                        <Monitor size={18} />
                        <div className="spec-details">
                            <span className="spec-label">Monitor</span>
                            <span className="spec-value">{computer.specs.monitor || '-'}</span>
                        </div>
                    </div>
                </div>
            )}

            {computer.installedGames && computer.installedGames.length > 0 && (
                <div className="games-section">
                    <h5 className="games-title">
                        <Gamepad2 size={16} />
                        Telepített játékok
                    </h5>
                    <div className="games-list">
                        {computer.installedGames.map((game, index) => (
                            <span key={index} className="game-tag">
                                {game}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
