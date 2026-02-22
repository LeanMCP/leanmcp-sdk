// ============================================================================
// Mock Product Database
// ============================================================================

export interface Product {
    id: string;
    name: string;
    description: string;
    category: string;
    price: number;
    currency: string;
    brand: string;
    rating: number;
    reviewCount: number;
    inStock: boolean;
    tags: string[];
    imageUrl: string;
    createdAt: string;
}

export const products: Product[] = [
    {
        id: 'prod-001',
        name: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and hi-res audio support.',
        category: 'Electronics',
        price: 299.99,
        currency: 'USD',
        brand: 'SoundMax',
        rating: 4.7,
        reviewCount: 2341,
        inStock: true,
        tags: ['wireless', 'noise-cancelling', 'bluetooth', 'audio', 'headphones'],
        imageUrl: 'https://example.com/images/headphones-001.jpg',
        createdAt: '2024-08-15T10:00:00Z'
    },
    {
        id: 'prod-002',
        name: 'Organic Cotton T-Shirt',
        description: 'Soft, breathable organic cotton t-shirt available in multiple colors. Sustainably sourced and ethically made.',
        category: 'Clothing',
        price: 29.99,
        currency: 'USD',
        brand: 'EcoWear',
        rating: 4.3,
        reviewCount: 578,
        inStock: true,
        tags: ['organic', 'cotton', 'sustainable', 'casual', 't-shirt'],
        imageUrl: 'https://example.com/images/tshirt-002.jpg',
        createdAt: '2024-09-01T08:30:00Z'
    },
    {
        id: 'prod-003',
        name: 'Stainless Steel Water Bottle',
        description: 'Double-walled insulated water bottle that keeps drinks cold for 24 hours or hot for 12 hours. BPA-free.',
        category: 'Home & Kitchen',
        price: 34.95,
        currency: 'USD',
        brand: 'HydroLife',
        rating: 4.6,
        reviewCount: 1892,
        inStock: true,
        tags: ['insulated', 'stainless-steel', 'bpa-free', 'eco-friendly', 'water-bottle'],
        imageUrl: 'https://example.com/images/bottle-003.jpg',
        createdAt: '2024-07-20T14:00:00Z'
    },
    {
        id: 'prod-004',
        name: 'The Art of Clean Code',
        description: 'A comprehensive guide to writing maintainable, scalable, and elegant software. Covers design patterns, refactoring, and testing.',
        category: 'Books',
        price: 42.00,
        currency: 'USD',
        brand: 'TechPress',
        rating: 4.8,
        reviewCount: 3456,
        inStock: true,
        tags: ['programming', 'software', 'clean-code', 'design-patterns', 'bestseller'],
        imageUrl: 'https://example.com/images/book-004.jpg',
        createdAt: '2024-03-10T09:00:00Z'
    },
    {
        id: 'prod-005',
        name: 'Yoga Mat Pro',
        description: 'Extra-thick 6mm yoga mat with non-slip surface. Includes carrying strap and alignment markers.',
        category: 'Sports',
        price: 49.99,
        currency: 'USD',
        brand: 'FlexFit',
        rating: 4.5,
        reviewCount: 892,
        inStock: true,
        tags: ['yoga', 'fitness', 'non-slip', 'exercise', 'mat'],
        imageUrl: 'https://example.com/images/yogamat-005.jpg',
        createdAt: '2024-06-05T11:30:00Z'
    },
    {
        id: 'prod-006',
        name: '4K Ultra HD Smart TV 55"',
        description: 'Stunning 4K display with HDR10+ support, built-in streaming apps, and voice control. Dolby Atmos audio.',
        category: 'Electronics',
        price: 649.99,
        currency: 'USD',
        brand: 'VisionTech',
        rating: 4.4,
        reviewCount: 1567,
        inStock: true,
        tags: ['4k', 'smart-tv', 'hdr', 'streaming', 'dolby-atmos'],
        imageUrl: 'https://example.com/images/tv-006.jpg',
        createdAt: '2024-10-01T16:00:00Z'
    },
    {
        id: 'prod-007',
        name: 'Merino Wool Sweater',
        description: 'Luxuriously soft merino wool sweater. Temperature regulating, moisture-wicking, and odor resistant.',
        category: 'Clothing',
        price: 89.99,
        currency: 'USD',
        brand: 'AlpineKnit',
        rating: 4.6,
        reviewCount: 423,
        inStock: true,
        tags: ['merino', 'wool', 'sweater', 'winter', 'premium'],
        imageUrl: 'https://example.com/images/sweater-007.jpg',
        createdAt: '2024-09-15T10:00:00Z'
    },
    {
        id: 'prod-008',
        name: 'Cast Iron Dutch Oven',
        description: 'Enameled cast iron dutch oven, 6-quart capacity. Perfect for braising, baking, and slow cooking.',
        category: 'Home & Kitchen',
        price: 79.99,
        currency: 'USD',
        brand: 'IronChef',
        rating: 4.9,
        reviewCount: 2678,
        inStock: false,
        tags: ['cast-iron', 'dutch-oven', 'cooking', 'braising', 'premium'],
        imageUrl: 'https://example.com/images/dutchoven-008.jpg',
        createdAt: '2024-04-22T13:00:00Z'
    },
    {
        id: 'prod-009',
        name: 'Machine Learning Fundamentals',
        description: 'Learn machine learning from scratch with hands-on Python examples. Covers neural networks, NLP, and computer vision.',
        category: 'Books',
        price: 54.99,
        currency: 'USD',
        brand: 'TechPress',
        rating: 4.5,
        reviewCount: 1234,
        inStock: true,
        tags: ['machine-learning', 'python', 'ai', 'data-science', 'textbook'],
        imageUrl: 'https://example.com/images/book-009.jpg',
        createdAt: '2024-05-18T08:00:00Z'
    },
    {
        id: 'prod-010',
        name: 'Resistance Bands Set',
        description: 'Set of 5 resistance bands with varying tension levels. Includes door anchor, handles, and ankle straps.',
        category: 'Sports',
        price: 24.99,
        currency: 'USD',
        brand: 'FlexFit',
        rating: 4.3,
        reviewCount: 2100,
        inStock: true,
        tags: ['resistance-bands', 'fitness', 'home-workout', 'strength-training', 'portable'],
        imageUrl: 'https://example.com/images/bands-010.jpg',
        createdAt: '2024-08-28T09:30:00Z'
    },
    {
        id: 'prod-011',
        name: 'Wireless Mechanical Keyboard',
        description: 'Compact 75% mechanical keyboard with hot-swappable switches, RGB backlighting, and multi-device Bluetooth.',
        category: 'Electronics',
        price: 129.99,
        currency: 'USD',
        brand: 'KeyCraft',
        rating: 4.7,
        reviewCount: 934,
        inStock: true,
        tags: ['mechanical', 'keyboard', 'wireless', 'rgb', 'bluetooth'],
        imageUrl: 'https://example.com/images/keyboard-011.jpg',
        createdAt: '2024-11-03T12:00:00Z'
    },
    {
        id: 'prod-012',
        name: 'Running Shoes Ultra Boost',
        description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Great for daily training.',
        category: 'Sports',
        price: 139.99,
        currency: 'USD',
        brand: 'StrideMax',
        rating: 4.4,
        reviewCount: 1876,
        inStock: true,
        tags: ['running', 'shoes', 'cushioning', 'breathable', 'training'],
        imageUrl: 'https://example.com/images/shoes-012.jpg',
        createdAt: '2024-07-14T10:30:00Z'
    },
    {
        id: 'prod-013',
        name: 'Ceramic Pour-Over Coffee Maker',
        description: 'Handcrafted ceramic dripper for pour-over coffee. Produces a clean, flavorful cup every time.',
        category: 'Home & Kitchen',
        price: 38.00,
        currency: 'USD',
        brand: 'BrewCraft',
        rating: 4.7,
        reviewCount: 645,
        inStock: true,
        tags: ['coffee', 'pour-over', 'ceramic', 'handcrafted', 'brewing'],
        imageUrl: 'https://example.com/images/coffee-013.jpg',
        createdAt: '2024-06-30T15:00:00Z'
    },
    {
        id: 'prod-014',
        name: 'Slim Fit Denim Jeans',
        description: 'Classic slim fit jeans made from premium stretch denim. Comfortable all-day wear with modern styling.',
        category: 'Clothing',
        price: 69.99,
        currency: 'USD',
        brand: 'DenimCo',
        rating: 4.2,
        reviewCount: 1345,
        inStock: true,
        tags: ['denim', 'jeans', 'slim-fit', 'stretch', 'casual'],
        imageUrl: 'https://example.com/images/jeans-014.jpg',
        createdAt: '2024-08-05T11:00:00Z'
    },
    {
        id: 'prod-015',
        name: 'USB-C Portable Charger 20000mAh',
        description: 'High-capacity portable charger with USB-C PD fast charging. Charges a phone 4+ times. LED power indicator.',
        category: 'Electronics',
        price: 45.99,
        currency: 'USD',
        brand: 'PowerVault',
        rating: 4.5,
        reviewCount: 3210,
        inStock: true,
        tags: ['portable-charger', 'usb-c', 'fast-charging', 'power-bank', 'travel'],
        imageUrl: 'https://example.com/images/charger-015.jpg',
        createdAt: '2024-09-20T08:00:00Z'
    },
    {
        id: 'prod-016',
        name: 'Adjustable Dumbbell Set',
        description: 'Space-saving adjustable dumbbells, 5-52.5 lbs per hand. Quick-lock mechanism for fast weight changes.',
        category: 'Sports',
        price: 349.99,
        currency: 'USD',
        brand: 'IronGrip',
        rating: 4.8,
        reviewCount: 567,
        inStock: false,
        tags: ['dumbbells', 'adjustable', 'strength-training', 'home-gym', 'weights'],
        imageUrl: 'https://example.com/images/dumbbells-016.jpg',
        createdAt: '2024-10-12T14:30:00Z'
    },
    {
        id: 'prod-017',
        name: 'Bamboo Cutting Board Set',
        description: 'Set of 3 organic bamboo cutting boards in different sizes. Knife-friendly, antimicrobial, and easy to clean.',
        category: 'Home & Kitchen',
        price: 27.99,
        currency: 'USD',
        brand: 'GreenHome',
        rating: 4.4,
        reviewCount: 890,
        inStock: true,
        tags: ['bamboo', 'cutting-board', 'kitchen', 'eco-friendly', 'antimicrobial'],
        imageUrl: 'https://example.com/images/cuttingboard-017.jpg',
        createdAt: '2024-05-25T10:00:00Z'
    },
    {
        id: 'prod-018',
        name: 'API Design Patterns',
        description: 'Master the art of designing robust, scalable APIs. Covers REST, GraphQL, gRPC, and event-driven architectures.',
        category: 'Books',
        price: 48.99,
        currency: 'USD',
        brand: 'TechPress',
        rating: 4.6,
        reviewCount: 789,
        inStock: true,
        tags: ['api', 'rest', 'graphql', 'architecture', 'design-patterns'],
        imageUrl: 'https://example.com/images/book-018.jpg',
        createdAt: '2024-07-08T09:00:00Z'
    },
    {
        id: 'prod-019',
        name: 'Waterproof Hiking Jacket',
        description: 'Lightweight, packable waterproof jacket with sealed seams. Perfect for hiking, camping, and travel.',
        category: 'Clothing',
        price: 119.99,
        currency: 'USD',
        brand: 'TrailBlazer',
        rating: 4.5,
        reviewCount: 654,
        inStock: true,
        tags: ['waterproof', 'hiking', 'jacket', 'outdoor', 'packable'],
        imageUrl: 'https://example.com/images/jacket-019.jpg',
        createdAt: '2024-10-25T13:00:00Z'
    },
    {
        id: 'prod-020',
        name: 'Smart Fitness Watch',
        description: 'Advanced fitness tracker with heart rate monitoring, GPS, sleep tracking, and 7-day battery life.',
        category: 'Electronics',
        price: 199.99,
        currency: 'USD',
        brand: 'FitTech',
        rating: 4.3,
        reviewCount: 2456,
        inStock: true,
        tags: ['smartwatch', 'fitness', 'gps', 'heart-rate', 'health'],
        imageUrl: 'https://example.com/images/watch-020.jpg',
        createdAt: '2024-11-10T10:00:00Z'
    }
];

// ============================================================================
// Helper exports
// ============================================================================

export const categories: string[] = [...new Set(products.map(p => p.category))].sort();
export const brands: string[] = [...new Set(products.map(p => p.brand))].sort();
export const priceRange = {
    min: Math.min(...products.map(p => p.price)),
    max: Math.max(...products.map(p => p.price))
};
