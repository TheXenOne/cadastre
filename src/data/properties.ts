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
};

// Hard-coded sample properties.
// Later we’ll load these from JSON / DB instead.
export const properties: Property[] = [
    {
        id: 1,
        name: "Test Office A",
        fullAddress: "Somewhere in the City, London",
        lat: 51.515,
        lng: -0.09,
        propertyType: "office",
        ownerName: "Acme PropCo Ltd",
        contactSummary: "Acme PropCo – info@acme-propco.example",
    },
    {
        id: 2,
        name: "Test Office B",
        fullAddress: "Somewhere in Westminster, London",
        lat: 51.505,
        lng: -0.13,
        propertyType: "office",
        ownerName: "Beta Holdings PLC",
        contactSummary: "Beta Holdings – property@beta-holdings.example",
    },
];
