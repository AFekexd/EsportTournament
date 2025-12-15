import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Users, FileText, Image as ImageIcon } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { createTeam } from '../store/slices/teamsSlice';
import './TeamCreate.css';

interface TeamFormData {
    name: string;
    description: string;
    logoUrl: string;
}

const STEPS = [
    { id: 1, title: 'Alapadatok', icon: FileText },
    { id: 2, title: 'Logó', icon: ImageIcon },
    { id: 3, title: 'Összefoglaló', icon: Check },
];

export function TeamCreatePage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { createLoading, error } = useAppSelector((state) => state.teams);

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<TeamFormData>({
        name: '',
        description: '',
        logoUrl: '',
    });
    const [errors, setErrors] = useState<Partial<TeamFormData>>({});

    const validateStep = (step: number): boolean => {
        const newErrors: Partial<TeamFormData> = {};

        if (step === 1) {
            if (!formData.name || formData.name.length < 3) {
                newErrors.name = 'A csapat nevének legalább 3 karakter hosszúnak kell lennie';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        try {
            const result = await dispatch(createTeam({
                name: formData.name,
                description: formData.description || undefined,
                logoUrl: formData.logoUrl || undefined,
            })).unwrap();

            // Navigate to the newly created team
            navigate(`/teams/${result.id}`);
        } catch (err) {
            console.error('Failed to create team:', err);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="step-content">
                        <h2 className="step-title">Alapadatok</h2>
                        <p className="step-description">Add meg a csapat alapvető információit</p>

                        <div className="form-group">
                            <label htmlFor="name" className="form-label">
                                Csapat neve <span className="required">*</span>
                            </label>
                            <input
                                id="name"
                                type="text"
                                className={`input ${errors.name ? 'input-error' : ''}`}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Pl: Thunder Esports"
                                maxLength={50}
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                            <span className="help-text">{formData.name.length}/50 karakter</span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label">
                                Leírás
                            </label>
                            <textarea
                                id="description"
                                className="input textarea"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Rövid leírás a csapatról..."
                                rows={4}
                                maxLength={500}
                            />
                            <span className="help-text">{formData.description.length}/500 karakter</span>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="step-content">
                        <h2 className="step-title">Csapat logó</h2>
                        <p className="step-description">Adj hozzá egy logót a csapatodhoz (opcionális)</p>

                        <div className="form-group">
                            <label htmlFor="logoUrl" className="form-label">
                                Logó URL
                            </label>
                            <input
                                id="logoUrl"
                                type="url"
                                className="input"
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                placeholder="https://example.com/logo.png"
                            />
                            <span className="help-text">Adj meg egy URL-t a csapat logójához</span>
                        </div>

                        {formData.logoUrl && (
                            <div className="logo-preview">
                                <p className="form-label">Előnézet:</p>
                                <div className="logo-preview-container">
                                    <img
                                        src={formData.logoUrl}
                                        alt="Team logo preview"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="step-content">
                        <h2 className="step-title">Összefoglaló</h2>
                        <p className="step-description">Ellenőrizd a csapat adatait létrehozás előtt</p>

                        <div className="summary-card card">
                            <div className="summary-row">
                                <span className="summary-label">Csapat neve:</span>
                                <span className="summary-value">{formData.name}</span>
                            </div>

                            {formData.description && (
                                <div className="summary-row">
                                    <span className="summary-label">Leírás:</span>
                                    <span className="summary-value">{formData.description}</span>
                                </div>
                            )}

                            {formData.logoUrl && (
                                <div className="summary-row">
                                    <span className="summary-label">Logó:</span>
                                    <div className="summary-logo">
                                        <img src={formData.logoUrl} alt="Team logo" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="error-alert">
                                <p>{error}</p>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="team-create-page">
            <div className="page-header">
                <button className="btn btn-ghost" onClick={() => navigate('/teams')}>
                    <ArrowLeft size={18} />
                    Vissza
                </button>
                <h1 className="page-title">Új csapat létrehozása</h1>
            </div>

            {/* Progress Indicator */}
            <div className="progress-container">
                <div className="progress-steps">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="progress-step-wrapper">
                            <div
                                className={`progress-step ${currentStep === step.id
                                        ? 'active'
                                        : currentStep > step.id
                                            ? 'completed'
                                            : ''
                                    }`}
                            >
                                <div className="step-icon">
                                    {currentStep > step.id ? (
                                        <Check size={20} />
                                    ) : (
                                        <step.icon size={20} />
                                    )}
                                </div>
                                <span className="step-label">{step.title}</span>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div
                                    className={`progress-line ${currentStep > step.id ? 'completed' : ''
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Content */}
            <div className="form-container card">
                {renderStepContent()}

                {/* Navigation Buttons */}
                <div className="form-actions">
                    {currentStep > 1 && (
                        <button className="btn btn-secondary" onClick={handleBack}>
                            <ArrowLeft size={18} />
                            Vissza
                        </button>
                    )}

                    <div className="flex-spacer" />

                    {currentStep < STEPS.length ? (
                        <button className="btn btn-primary" onClick={handleNext}>
                            Következő
                            <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={createLoading}
                        >
                            {createLoading ? (
                                <>
                                    <div className="spinner" />
                                    Létrehozás...
                                </>
                            ) : (
                                <>
                                    <Users size={18} />
                                    Csapat létrehozása
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
