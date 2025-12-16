import { useState, useEffect } from 'react';
import { Send, AtSign, MessageSquare } from 'lucide-react';
import { authService } from '../lib/auth-service';
import { API_URL } from '../config';
import './DiscordAdmin.css';

interface DiscordChannel {
    id: string;
    name: string;
    icon: string;
}

interface MentionSuggestion {
    type: 'user' | 'team';
    id: string;
    name: string;
    mention: string;
}

export function DiscordAdminPage() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [mentions, setMentions] = useState('');
    const [color, setColor] = useState('#8b5cf6');
    const [channel, setChannel] = useState('general');
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        const token = authService.keycloak?.token;
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/discord/channels`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success && data.data) {
                setChannels(data.data);
                if (data.data.length > 0) {
                    setChannel(data.data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch channels:', err);
        }
    };

    const searchMentions = async (query: string) => {
        if (!query || query.length < 2) {
            setMentionSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const token = authService.keycloak?.token;
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/discord/search-mentions?query=${encodeURIComponent(query)}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (data.success && data.data) {
                setMentionSuggestions(data.data);
                setShowSuggestions(data.data.length > 0);
            }
        } catch (err) {
            console.error('Failed to search mentions:', err);
        }
    };

    const handleMentionSearchChange = (value: string) => {
        setMentionSearch(value);
        searchMentions(value);
    };

    const addMention = (suggestion: MentionSuggestion) => {
        const current = mentions ? mentions + ', ' : '';
        setMentions(current + suggestion.mention);
        setMentionSearch('');
        setShowSuggestions(false);
    };

    const handleSend = async () => {
        if (!title || !message) {
            setError('Cím és üzenet megadása kötelező!');
            return;
        }

        const token = authService.keycloak?.token;
        if (!token) {
            setError('Nincs bejelentkezve!');
            return;
        }

        setIsSending(true);
        setSendSuccess(false);
        setError('');

        try {
            const mentionArray = mentions
                .split(',')
                .map((m) => m.trim())
                .filter((m) => m.length > 0);

            const response = await fetch(`${API_URL}/discord/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title,
                    message,
                    color,
                    channel,
                    mentions: mentionArray.length > 0 ? mentionArray : undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSendSuccess(true);
                setTitle('');
                setMessage('');
                setMentions('');
                setTimeout(() => setSendSuccess(false), 3000);
            } else {
                setError(data.error?.message || 'Sikertelen küldés');
            }
        } catch (err) {
            setError('Hiba történt az üzenet küldése közben');
        } finally {
            setIsSending(false);
        }
    };

    const quickMentions = [
        { label: '@everyone', value: '@everyone' },
        { label: '@here', value: '@here' },
        { label: 'Példa csapat', value: '@Team Alpha' },
    ];

    const colorPresets = [
        { name: 'Purple (Default)', value: '#8b5cf6' },
        { name: 'Green (Success)', value: '#22c55e' },
        { name: 'Red (Alert)', value: '#ef4444' },
        { name: 'Blue (Info)', value: '#3b82f6' },
        { name: 'Amber (Warning)', value: '#f59e0b' },
    ];

    return (
        <div className="discord-admin-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Discord Üzenet Küldés</h1>
                    <p className="page-subtitle">Küldj értesítést az iskolai Discord szerverre</p>
                </div>
            </div>

            <div className="discord-form card">
                <div className="form-section">
                    <h2 className="section-title">
                        <MessageSquare size={20} />
                        Üzenet tartalma
                    </h2>

                    <div className="form-group">
                        <label htmlFor="title">Cím *</label>
                        <input
                            id="title"
                            type="text"
                            className="input"
                            placeholder="pl. Új verseny indul!"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="message">Üzenet *</label>
                        <textarea
                            id="message"
                            className="textarea"
                            rows={5}
                            placeholder="Írj egy részletes üzenetet..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="channel">Discord Csatorna *</label>
                        <select
                            id="channel"
                            className="input"
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                        >
                            {channels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.name}
                                </option>
                            ))}
                        </select>
                        <small className="input-hint">
                            Válaszd ki, melyik Discord csatornába kerüljön az üzenet
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="color">Szín</label>
                        <div className="color-picker">
                            {colorPresets.map((preset) => (
                                <button
                                    key={preset.value}
                                    className={`color-btn ${color === preset.value ? 'active' : ''}`}
                                    style={{ backgroundColor: preset.value }}
                                    onClick={() => setColor(preset.value)}
                                    title={preset.name}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="section-title">
                        <AtSign size={20} />
                        Említések (opcionális)
                    </h2>

                    <div className="form-group">
                        <label htmlFor="mentionSearch">Keresés felhasználók és csapatok között</label>
                        <div className="autocomplete-wrapper">
                            <input
                                id="mentionSearch"
                                type="text"
                                className="input"
                                placeholder="Kezdj el gépelni..."
                                value={mentionSearch}
                                onChange={(e) => handleMentionSearchChange(e.target.value)}
                                onFocus={() => mentionSuggestions.length > 0 && setShowSuggestions(true)}
                            />
                            {showSuggestions && mentionSuggestions.length > 0 && (
                                <div className="suggestions-dropdown">
                                    {mentionSuggestions.map((suggestion) => (
                                        <button
                                            key={`${suggestion.type}-${suggestion.id}`}
                                            className="suggestion-item"
                                            onClick={() => addMention(suggestion)}
                                            type="button"
                                        >
                                            <span className="suggestion-icon">
                                                {suggestion.type === 'user' ? '👤' : '👥'}
                                            </span>
                                            <div className="suggestion-info">
                                                <span className="suggestion-name">{suggestion.name}</span>
                                                <span className="suggestion-mention">{suggestion.mention}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <small className="input-hint">
                            Írj be legalább 2 karaktert a kereséshez
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="mentions">Kiválasztott említések</label>
                        <input
                            id="mentions"
                            type="text"
                            className="input"
                            placeholder="@everyone, @Team Alpha, @username"
                            value={mentions}
                            onChange={(e) => setMentions(e.target.value)}
                        />
                        <small className="input-hint">
                            Manuálisan is hozzáadhatsz említéseket, vesszővel elválasztva
                        </small>
                    </div>

                    <div className="quick-mentions">
                        <span className="quick-label">Gyors hozzáadás:</span>
                        {quickMentions.map((mention) => (
                            <button
                                key={mention.value}
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                    const current = mentions ? mentions + ', ' : '';
                                    setMentions(current + mention.value);
                                }}
                            >
                                {mention.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>❌ {error}</span>
                    </div>
                )}

                {sendSuccess && (
                    <div className="alert alert-success">
                        <span>✅ Üzenet sikeresen elküldve a Discord szerverre!</span>
                    </div>
                )}

                <div className="form-actions">
                    <button
                        className={`btn ${sendSuccess ? 'btn-success' : 'btn-primary'} btn-large`}
                        onClick={handleSend}
                        disabled={isSending || !title || !message}
                    >
                        <Send size={18} />
                        {isSending ? 'Küldés...' : sendSuccess ? 'Elküldve!' : 'Üzenet küldése'}
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="discord-preview-section card">
                <h2 className="section-title">Előnézet</h2>
                <p className="section-description">Így fog kinézni az üzenet Discord-on:</p>
                <div className="discord-preview">
                    <div className="discord-embed">
                        <div className="embed-color" style={{ backgroundColor: color }}></div>
                        <div className="embed-content">
                            {mentions && (
                                <div className="embed-mentions">
                                    {mentions.split(',').map((m, i) => (
                                        <span key={i} className="mention-tag">
                                            {m.trim()}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="embed-title">{title || 'Üzenet címe'}</div>
                            <div className="embed-description">{message || 'Üzenet szövege...'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
