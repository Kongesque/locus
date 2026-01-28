"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import EchoLoader from "@/components/echo-loader";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading, setupComplete } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (isLoading) return;

        // Redirect authenticated users away from login page
        if (pathname === "/login" && isAuthenticated) {
            router.push("/");
            return;
        }

        // Redirect users away from setup page if setup is already complete
        if (pathname === "/setup" && setupComplete === true) {
            router.push("/");
            return;
        }

        // If on setup or login page, let them through
        if (pathname === "/setup" || pathname === "/login") {
            return;
        }

        // If setup not complete, redirect to setup
        if (setupComplete === false) {
            router.push("/setup");
            return;
        }

        // If setup complete but not authenticated, redirect to login
        if (setupComplete === true && !isAuthenticated) {
            router.push("/login");
            return;
        }
    }, [isAuthenticated, isLoading, setupComplete, pathname, router]);

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
                <EchoLoader size={48} />
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    // If on setup page and setup not complete, render
    if (pathname === "/setup" && setupComplete === false) {
        return <>{children}</>;
    }

    // If on login page and setup complete, render
    if (pathname === "/login" && setupComplete === true) {
        return <>{children}</>;
    }

    // If authenticated, render children
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Otherwise show nothing (redirect will happen)
    return null;
}
