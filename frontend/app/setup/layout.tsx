import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Setup - Locus",
    description: "Initial setup for Locus",
};

export default function SetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            {children}
        </div>
    );
}
