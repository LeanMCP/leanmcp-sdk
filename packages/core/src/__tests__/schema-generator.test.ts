import 'reflect-metadata';

// Mock type-parser to avoid import.meta.url ESM incompatibility with ts-jest
jest.mock('../type-parser', () => ({
    parseClassTypesSync: () => null,
    registerClassSource: () => { },
}));

import { Optional, SchemaConstraint, classToJsonSchemaWithConstraints } from '../schema-generator';

// ============================================================================
// @Optional Decorator
// ============================================================================

describe('@Optional', () => {
    test('should mark property as optional', () => {
        class TestInput {
            @Optional()
            optionalField?: string;
        }

        const instance = new TestInput();
        expect(Reflect.getMetadata('optional', instance, 'optionalField')).toBe(true);
    });

    test('should not mark other properties as optional', () => {
        class TestInput {
            requiredField!: string;

            @Optional()
            optionalField?: string;
        }

        const instance = new TestInput();
        expect(Reflect.getMetadata('optional', instance, 'requiredField')).toBeUndefined();
        expect(Reflect.getMetadata('optional', instance, 'optionalField')).toBe(true);
    });
});

// ============================================================================
// @SchemaConstraint Decorator
// ============================================================================

describe('@SchemaConstraint', () => {
    test('should store description constraint', () => {
        class TestInput {
            @SchemaConstraint({ description: 'User name' })
            name!: string;
        }

        const instance = new TestInput();
        const constraints = Reflect.getMetadata('schema:constraints', instance, 'name');
        expect(constraints.description).toBe('User name');
    });

    test('should store string constraints', () => {
        class TestInput {
            @SchemaConstraint({ minLength: 1, maxLength: 100, pattern: '^[a-z]+$' })
            text!: string;
        }

        const instance = new TestInput();
        const constraints = Reflect.getMetadata('schema:constraints', instance, 'text');
        expect(constraints.minLength).toBe(1);
        expect(constraints.maxLength).toBe(100);
        expect(constraints.pattern).toBe('^[a-z]+$');
    });

    test('should store number constraints', () => {
        class TestInput {
            @SchemaConstraint({ minimum: 0, maximum: 100 })
            score!: number;
        }

        const instance = new TestInput();
        const constraints = Reflect.getMetadata('schema:constraints', instance, 'score');
        expect(constraints.minimum).toBe(0);
        expect(constraints.maximum).toBe(100);
    });

    test('should store enum constraint', () => {
        class TestInput {
            @SchemaConstraint({ enum: ['asc', 'desc'] })
            sortOrder!: string;
        }

        const instance = new TestInput();
        const constraints = Reflect.getMetadata('schema:constraints', instance, 'sortOrder');
        expect(constraints.enum).toEqual(['asc', 'desc']);
    });

    test('should store default value', () => {
        class TestInput {
            @SchemaConstraint({ default: 10, description: 'Page size' })
            pageSize!: number;
        }

        const instance = new TestInput();
        const constraints = Reflect.getMetadata('schema:constraints', instance, 'pageSize');
        expect(constraints.default).toBe(10);
    });

    test('should store multiple constraints on different properties', () => {
        class TestInput {
            @SchemaConstraint({ description: 'First name', minLength: 1 })
            firstName!: string;

            @SchemaConstraint({ description: 'Age', minimum: 0, maximum: 150 })
            age!: number;
        }

        const instance = new TestInput();
        const nameConstraints = Reflect.getMetadata('schema:constraints', instance, 'firstName');
        const ageConstraints = Reflect.getMetadata('schema:constraints', instance, 'age');

        expect(nameConstraints.description).toBe('First name');
        expect(nameConstraints.minLength).toBe(1);
        expect(ageConstraints.minimum).toBe(0);
        expect(ageConstraints.maximum).toBe(150);
    });
});

// ============================================================================
// classToJsonSchemaWithConstraints()
// ============================================================================

describe('classToJsonSchemaWithConstraints', () => {
    test('should generate schema with required fields', () => {
        class TestInput {
            @SchemaConstraint({ description: 'Query text' })
            query!: string;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        expect(schema.type).toBe('object');
        expect(schema.properties.query).toBeDefined();
        expect(schema.properties.query.description).toBe('Query text');
        expect(schema.required).toContain('query');
    });

    test('should mark @Optional fields as not required', () => {
        class TestInput {
            @SchemaConstraint({ description: 'Required field' })
            required!: string;

            @Optional()
            @SchemaConstraint({ description: 'Optional field' })
            optional?: string;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        expect(schema.required).toContain('required');
        expect(schema.required).not.toContain('optional');
    });

    test('should include constraints in schema properties', () => {
        class TestInput {
            @SchemaConstraint({ description: 'Name', minLength: 1, maxLength: 50 })
            name!: string;

            @SchemaConstraint({ description: 'Count', minimum: 0, maximum: 100 })
            count!: number;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        expect(schema.properties.name.minLength).toBe(1);
        expect(schema.properties.name.maxLength).toBe(50);
        expect(schema.properties.count.minimum).toBe(0);
        expect(schema.properties.count.maximum).toBe(100);
    });

    test('should include enum in schema', () => {
        class TestInput {
            @SchemaConstraint({
                description: 'Sort order',
                enum: ['price_asc', 'price_desc', 'rating']
            })
            sortBy!: string;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        expect(schema.properties.sortBy.enum).toEqual(['price_asc', 'price_desc', 'rating']);
    });

    test('should include default values in schema', () => {
        class TestInput {
            @Optional()
            @SchemaConstraint({ description: 'Page size', default: 10 })
            pageSize?: number;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        expect(schema.properties.pageSize.default).toBe(10);
    });

    test('should handle class with no properties', () => {
        class EmptyInput { }

        const schema = classToJsonSchemaWithConstraints(EmptyInput);

        expect(schema.type).toBe('object');
        expect(Object.keys(schema.properties)).toHaveLength(0);
    });

    test('should infer string type from string constraints', () => {
        class TestInput {
            @SchemaConstraint({ minLength: 1 })
            text!: string;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        // When design:type is unavailable, minLength implies string type
        expect(schema.properties.text.type).toBe('string');
    });

    test('should infer number type from number constraints', () => {
        class TestInput {
            @SchemaConstraint({ minimum: 0, maximum: 100 })
            score!: number;
        }

        const schema = classToJsonSchemaWithConstraints(TestInput);

        // When design:type is unavailable, minimum/maximum imply number type
        expect(schema.properties.score.type).toBe('number');
    });

    test('should handle a realistic input class', () => {
        class SearchInput {
            @Optional()
            @SchemaConstraint({ description: 'Search query', default: '' })
            query?: string;

            @Optional()
            @SchemaConstraint({
                description: 'Category filter',
                enum: ['Electronics', 'Books', 'Sports']
            })
            category?: string;

            @Optional()
            @SchemaConstraint({ description: 'Min price', minimum: 0 })
            minPrice?: number;

            @Optional()
            @SchemaConstraint({ description: 'Page', minimum: 1, default: 1 })
            page?: number;

            @SchemaConstraint({ description: 'Product ID', minLength: 1 })
            productId!: string;
        }

        const schema = classToJsonSchemaWithConstraints(SearchInput);

        // Only productId should be required
        expect(schema.required).toEqual(['productId']);

        // All 5 properties should exist
        expect(Object.keys(schema.properties)).toHaveLength(5);

        // Verify constraints merged
        expect(schema.properties.category.enum).toEqual(['Electronics', 'Books', 'Sports']);
        expect(schema.properties.minPrice.minimum).toBe(0);
        expect(schema.properties.page.default).toBe(1);
        expect(schema.properties.productId.minLength).toBe(1);
    });
});
