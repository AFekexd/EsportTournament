import { ScrollText } from "lucide-react";

export function GlobalRulesPage() {
    const pdfUrl = "/rules.pdf";

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <ScrollText size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Házirend</h1>
                    <p className="text-gray-400 text-lg">
                        A terem és a versenyek általános házirendje
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-[#1a1b26] rounded-2xl border border-white/10 shadow-xl overflow-hidden h-[80vh]">
                <iframe
                    src={pdfUrl}
                    className="w-full h-full"
                    title="Házirend"
                />
            </div>
        </div>
    );
}
