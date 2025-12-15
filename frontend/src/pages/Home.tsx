import { Link } from 'react-router-dom';
import { Trophy, Users, Gamepad2, Calendar, ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Home.css';

const features = [
    {
        icon: <Trophy size={24} />,
        title: 'Versenyek',
        description: 'Regisztrálj versenyekre és versenyezz a legjobb csapatokkal.',
    },
    {
        icon: <Users size={24} />,
        title: 'Csapatok',
        description: 'Hozz létre csapatot vagy csatlakozz meglévőkhöz.',
    },
    {
        icon: <Gamepad2 size={24} />,
        title: 'Játékok',
        description: 'Támogatunk minden népszerű esport játékot.',
    },
    {
        icon: <Star size={24} />,
        title: 'Ranglisták',
        description: 'ELO alapú rangsorrendszer a tiszta versenyzésért.',
    },
];

const stats = [
    { value: '500+', label: 'Aktív játékos' },
    { value: '50+', label: 'Csapat' },
    { value: '100+', label: 'Verseny' },
    { value: '10+', label: 'Játék' },
];

export function HomePage() {
    const { isAuthenticated, login } = useAuth();

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background">
                    <div className="hero-gradient" />
                    <div className="hero-grid" />
                </div>
                <div className="hero-content">
                    <div className="hero-badge">
                        <Zap size={14} />
                        <span>Iskolai Esport Platform</span>
                    </div>
                    <h1 className="hero-title">
                        Versenyezz a <span className="gradient-text">legjobbakkal</span>
                    </h1>
                    <p className="hero-subtitle">
                        Az iskolai esport versenysorozat hivatalos platformja. Regisztrálj csapatot,
                        jelentkezz versenyekre, és mutasd meg a tudásod!
                    </p>
                    <div className="hero-actions">
                        {isAuthenticated ? (
                            <>
                                <Link to="/tournaments" className="btn btn-primary btn-lg">
                                    Versenyek böngészése
                                    <ArrowRight size={18} />
                                </Link>
                                <Link to="/teams" className="btn btn-secondary btn-lg">
                                    Csapatok
                                </Link>
                            </>
                        ) : (
                            <>
                                <button className="btn btn-primary btn-lg" onClick={login}>
                                    Regisztráció / Bejelentkezés
                                    <ArrowRight size={18} />
                                </button>
                                <Link to="/tournaments" className="btn btn-secondary btn-lg">
                                    Versenyek böngészése
                                </Link>
                            </>
                        )}
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-card hero-card-1">
                        <Trophy size={32} className="text-primary" />
                        <span>Bracket generálás</span>
                    </div>
                    <div className="hero-card hero-card-2">
                        <Shield size={32} className="text-accent" />
                        <span>ELO rendszer</span>
                    </div>
                    <div className="hero-card hero-card-3">
                        <Calendar size={32} className="text-secondary" />
                        <span>Versenynaptár</span>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-card">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Miért válassz minket?</h2>
                    <p className="section-subtitle">
                        Modern platform az iskolai esport versenyekhez
                    </p>
                </div>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card card card-glow">
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-card">
                    <div className="cta-content">
                        <h2 className="cta-title">Készen állsz a versenyre?</h2>
                        <p className="cta-subtitle">
                            Csatlakozz most és légy te is része az iskolai esport közösségnek!
                        </p>
                    </div>
                    {isAuthenticated ? (
                        <Link to="/teams/create" className="btn btn-accent btn-lg">
                            Csapat létrehozása
                            <ArrowRight size={18} />
                        </Link>
                    ) : (
                        <button className="btn btn-accent btn-lg" onClick={login}>
                            Kezdjük el!
                            <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
