
import { useState, useEffect } from 'react';
import { Send, AtSign, MessageSquare, Hash, Check, Search, Palette, User, Users } from 'lucide-react';
import { authService } from '../lib/auth-service';
import { API_URL } from '../config';

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
    const [color, setColor] = useState('#5865F2'); // Default Discord Blurple
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
        { label: 'Példa Csapat', value: '@Team Alpha' },
    ];

    const colorPresets = [
        { name: 'Discord Blurple', value: '#5865F2' },
        { name: 'Siker Zöld', value: '#57F287' },
        { name: 'Hiba Piros', value: '#ED4245' },
        { name: 'Info Kék', value: '#3498DB' },
        { name: 'Figyelmeztető Sárga', value: '#FEE75C' },
        { name: 'Elegáns Fehér', value: '#FFFFFF' },
        { name: 'Sötét Szürke', value: '#95A5A6' },
        { name: 'Esport Lila', value: '#9B59B6' },
    ];

    return (
        <div className="discord-settings-page space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Send className="text-primary" size={32} />
                        Discord Üzenetközpont
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Azonnali értesítések küldése a hivatalos szerverre
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                {/* Left Column: Form */}
                <div className="space-y-6">

                    {/* Channel & Color Selection Card */}
                    <div className="card bg-secondary/50 border-white/5 p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <Hash size={20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Beállítások</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Channel Select */}
                            <div className="space-y-2">
                                <label htmlFor="channel" className="text-sm font-medium text-gray-300 block">Cél Csatorna</label>
                                <div className="relative">
                                    <select
                                        id="channel"
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none transition-all"
                                    >
                                        {channels.map((ch) => (
                                            <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                        ))}
                                    </select>
                                    <Hash className="absolute right-4 top-3.5 text-gray-500 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Palette size={16} />
                                    Üzenet Színe
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {colorPresets.map((preset) => (
                                        <button
                                            key={preset.value}
                                            onClick={() => setColor(preset.value)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all duration-200 transform hover:scale-110 flex items-center justify-center ${color === preset.value
                                                ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-110'
                                                : 'border-transparent hover:border-white/50'
                                                }`}
                                            style={{ backgroundColor: preset.value }}
                                            title={preset.name}
                                        >
                                            {color === preset.value && <Check size={16} className="text-white drop-shadow-md" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Message Content Card */}
                    <div className="card bg-secondary/50 border-white/5 p-6 shadow-xl relative overflow-hidden">
                        {/* Decorative glowing gradient */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                        <div className="flex items-center gap-2 mb-6 text-primary relative z-10">
                            <MessageSquare size={20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Üzenet Tartalma</h2>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="space-y-2">
                                <label htmlFor="title" className="text-sm font-medium text-gray-300">Címsor</label>
                                <input
                                    id="title"
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-bold"
                                    placeholder="Figyelemfelkeltő cím..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-gray-300">Részletes leírás</label>
                                <textarea
                                    id="message"
                                    rows={6}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-y min-h-[120px]"
                                    placeholder="Írd ide az üzenet fő tartalmát..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mentions Card */}
                    <div className="card bg-secondary/50 border-white/5 p-6 shadow-xl">
                        <div className="flex items-center gap-2 mb-6 text-primary">
                            <AtSign size={20} />
                            <h2 className="font-semibold uppercase tracking-wider text-sm">Említések</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="relative z-20">
                                <div className="relative">
                                    <Search className="absolute left-4 top-3.5 text-gray-500" size={16} />
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary transition-all"
                                        placeholder="Keresés: @név vagy csapat..."
                                        value={mentionSearch}
                                        onChange={(e) => handleMentionSearchChange(e.target.value)}
                                        onFocus={() => mentionSuggestions.length > 0 && setShowSuggestions(true)}
                                    />
                                </div>

                                {/* Autocomplete Dropdown */}
                                {showSuggestions && mentionSuggestions.length > 0 && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#2b2d31] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        {mentionSuggestions.map((suggestion) => (
                                            <button
                                                key={`${suggestion.type}-${suggestion.id}`}
                                                type="button"
                                                onClick={() => addMention(suggestion)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/20 hover:border-l-4 border-primary transition-all text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                                    {suggestion.type === 'user' ? <User size={16} /> : <Users size={16} />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-200 group-hover:text-white">{suggestion.name}</div>
                                                    <div className="text-xs text-gray-500">{suggestion.mention}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {quickMentions.map((qm) => (
                                    <button
                                        key={qm.value}
                                        type="button"
                                        onClick={() => {
                                            const current = mentions ? mentions + ', ' : '';
                                            setMentions(current + qm.value);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-xs font-medium text-gray-400 hover:text-white transition-all"
                                    >
                                        + {qm.label}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-2">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Aktív említések (vesszővel elválasztva)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-sm text-primary font-mono focus:outline-none focus:border-white/20"
                                    value={mentions}
                                    onChange={(e) => setMentions(e.target.value)}
                                    placeholder="@everyone"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Preview & Status */}
                <div className="space-y-6 lg:sticky lg:top-8">

                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 animate-slideIn">
                            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">!</div>
                            <div>
                                <h4 className="font-bold text-sm">Hiba történt</h4>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                        </div>
                    )}

                    {sendSuccess && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-start gap-3 animate-slideIn">
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">✓</div>
                            <div>
                                <h4 className="font-bold text-sm">Sikeres küldés!</h4>
                                <p className="text-sm opacity-90">Az üzenet megjelent a Discord szerveren.</p>
                            </div>
                        </div>
                    )}

                    {/* Preview Card */}
                    <div className="bg-[#313338] rounded-md shadow-2xl border border-[#2b2d31] overflow-hidden">
                        {/* Discord Window Header Mockup */}
                        <div className="bg-[#2b2d31] p-3 border-b border-[#1e1f22] flex items-center gap-2">
                            <Hash className="text-gray-400" size={16} />
                            <span className="text-sm font-semibold text-gray-200">{channels.find(c => c.id === channel)?.name || 'general'}</span>
                            <span className="text-xs text-gray-500 ml-auto">Előnézet</span>
                        </div>

                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Bot User Mockup */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                                    Bot
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-white">Esport Bot</span>
                                        <span className="bg-[#5865F2] text-white text-[10px] px-1.5 rounded uppercase font-bold tracking-wide py-[1px]">BOT</span>
                                        <span className="text-xs text-gray-400 ml-1">Most</span>
                                    </div>

                                    {/* Mentions Line */}
                                    {mentions && (
                                        <div className="mb-2 text-[#C9CDFB] bg-[#5865F2]/10 inline-block px-1 rounded text-sm font-medium">
                                            {mentions}
                                        </div>
                                    )}

                                    {/* Embed */}
                                    <div className="flex bg-[#2b2d31] border-l-4 rounded-r px-4 py-3 max-w-lg" style={{ borderLeftColor: color }}>
                                        <div className="grid gap-1.5">
                                            <h3 className="text-base font-semibold text-white break-words">
                                                {title || <span className="text-white/20 italic">Címsor helye...</span>}
                                            </h3>
                                            <p className="text-sm text-[#dbdee1] whitespace-pre-wrap break-words leading-relaxed">
                                                {message || <span className="text-white/20 italic">Üzenet szövege...</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <button
                        onClick={handleSend}
                        disabled={isSending || !title || !message}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isSending
                            ? 'bg-gray-400 text-gray-400 cursor-not-allowed'
                            : sendSuccess
                                ? 'bg-green-600 hover:bg-green-500 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                    >
                        {isSending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : sendSuccess ? (
                            <>
                                <Check size={24} />
                                Elküldve!
                            </>
                        ) : (
                            <>
                                <Send size={24} />
                                Küldés
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

}
