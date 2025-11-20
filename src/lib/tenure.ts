export function tenureLabel(code?: string | null) {
    switch ((code ?? "").toUpperCase()) {
        case "F": return "Freehold";
        case "L": return "Leasehold";
        default: return "Unknown";
    }
}
