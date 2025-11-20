// Core property type we’ll use across the app for now.
export type Property = {
    id: number;
    name: string;
    fullAddress: string;
    lat: number;
    lng: number;
    propertyType: "office" | "retail" | "industrial" | "residential_block" | "other";
    ownerName: string;
    contactSummary: string | null;

    // New fields, all optional/nullable for now:
    lastSalePrice: number | null;   // e.g. 1200000 means £1,200,000
    lastSaleDate: string | null;    // e.g. "2020-05-10" or "May 2020"
    rateableValue: number | null;   // business rates proxy
    epcRating: string | null;       // e.g. "B", "C", "D"
};
