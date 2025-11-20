export type Property = {
    id: number;
    addressKey?: string | null;

    name: string;
    fullAddress: string;
    postcode?: string | null;
    district?: string | null;

    propertyType: string;
    tenure?: string | null;
    newBuild?: string | null;

    ownerName: string;
    lat: number;
    lng: number;
    lastSalePrice?: number | null;
    lastSaleDate?: string | null;
    rateableValue?: number | null;
    epcRating?: string | null;
    contactSummary?: string | null;
};
