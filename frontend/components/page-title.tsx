"use client"

import { usePathname } from "next/navigation"

const pageTitles: Record<string, string> = {
    "/": "Home",
    "/analytics": "Analytics",
    "/video-analytics": "Video Analytics",
    "/livestream": "Live Stream",
    "/settings": "Settings",
    "/templates": "Templates",
    "/create/[taskId]": "Create",
}

export function getPageTitle(pathname: string | null) {
    if (!pathname) return "Page"
    if (pageTitles[pathname]) return pageTitles[pathname]

    // Handle dynamic routes
    for (const [route, title] of Object.entries(pageTitles)) {
        if (route.includes("[") && route.includes("]")) {
            // Convert path pattern to regex (e.g. /create/[id] -> /create/[^/]+)
            // specific replace for [anything] with [^/]+ (one segment)
            const regexStr = "^" + route.replace(/\[.*?\]/g, "[^/]+") + "$"
            if (new RegExp(regexStr).test(pathname)) {
                return title
            }
        }
    }

    return "Page"
}

export function PageTitle() {
    const pathname = usePathname()
    const title = getPageTitle(pathname)

    return <span className="text-sm font-medium">{title}</span>
}

interface PageTitle2Props {
    title?: string
}

export function PageTitle2({ title }: PageTitle2Props) {
    const pathname = usePathname()
    const resolvedTitle = title ?? getPageTitle(pathname)

    return <span className="text-2xl font-semibold tracking-tight">{resolvedTitle}</span>
}
