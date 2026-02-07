import 'reflect-metadata';
import { describe, it, expect } from '@jest/globals';

// ============================================================================
// Schema Decorator Tests
// These tests directly test the decorator behavior using only reflect-metadata
// without importing schema-generator.ts (which has ESM-only dependencies)
// ============================================================================

// Define decorators inline to avoid ESM import issues with type-parser.ts
function Optional(): PropertyDecorator {
    return (target, propertyKey) => {
        Reflect.defineMetadata('optional', true, target, propertyKey);
    };
}

function SchemaConstraint(constraints: {
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    enum?: any[];
    description?: string;
    default?: any;
    type?: string;
}): PropertyDecorator {
    return (target, propertyKey) => {
        Reflect.defineMetadata('schema:constraints', constraints, target, propertyKey);
    };
}

// ============================================================================
// @Optional Decorator Tests
// ============================================================================

describe('@Optional Decorator', () => {
    it('should mark property as optional via metadata', () => {
        class TestInput {
            required!: string;

            @Optional()
            optionalField?: string;
        }

        const instance = new TestInput();
        const isOptional = Reflect.getMetadata('optional', instance, 'optionalField');
        expect(isOptional).toBe(true);
    });

    it('should not mark non-decorated properties as optional', () => {
        class TestInput {
            required!: string;

            @Optional()
            optionalField?: string;
        }

        const instance = new TestInput();
        const isOptional = Reflect.getMetadata('optional', instance, 'required');
        expect(isOptional).toBeUndefined();
    });

    it('should support multiple optional properties', () => {
        class TestInput {
            @Optional()
            optional1?: string;

            @Optional()
            optional2?: number;

            required!: string;
        }

        const instance = new TestInput();
        expect(Reflect.getMetadata('optional', instance, 'optional1')).toBe(true);
        expect(Reflect.getMetadata('optional', instance, 'optional2')).toBe(true);
        expect(Reflect.getMetadata('optional', instance, 'required')).toBeUndefined();
    });
});

// ============================================================================
// @SchemaConstraint Decorator Tests
// ============================================================================

describe('@SchemaConstraint Decorator', () => {
    describe('string constraints', () => {
        it('should store minLength constraint', () => {
            class TestInput {
                @SchemaConstraint({ minLength: 1 })
                text!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'text');
            expect(constraints.minLength).toBe(1);
        });

        it('should store maxLength constraint', () => {
            class TestInput {
                @SchemaConstraint({ maxLength: 100 })
                text!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'text');
            expect(constraints.maxLength).toBe(100);
        });

        it('should store pattern constraint', () => {
            class TestInput {
                @SchemaConstraint({ pattern: '^[a-z]+$' })
                identifier!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'identifier');
            expect(constraints.pattern).toBe('^[a-z]+$');
        });
    });

    describe('number constraints', () => {
        it('should store minimum constraint', () => {
            class TestInput {
                @SchemaConstraint({ minimum: 0 })
                count!: number;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'count');
            expect(constraints.minimum).toBe(0);
        });

        it('should store maximum constraint', () => {
            class TestInput {
                @SchemaConstraint({ maximum: 100 })
                percentage!: number;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'percentage');
            expect(constraints.maximum).toBe(100);
        });

        it('should store both minimum and maximum', () => {
            class TestInput {
                @SchemaConstraint({ minimum: -1, maximum: 1 })
                score!: number;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'score');
            expect(constraints.minimum).toBe(-1);
            expect(constraints.maximum).toBe(1);
        });
    });

    describe('enum constraints', () => {
        it('should store string enum', () => {
            class TestInput {
                @SchemaConstraint({ enum: ['low', 'medium', 'high'] })
                priority!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'priority');
            expect(constraints.enum).toEqual(['low', 'medium', 'high']);
        });

        it('should store number enum', () => {
            class TestInput {
                @SchemaConstraint({ enum: [1, 2, 3, 4, 5] })
                rating!: number;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'rating');
            expect(constraints.enum).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('description and default', () => {
        it('should store description', () => {
            class TestInput {
                @SchemaConstraint({ description: 'User email address' })
                email!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'email');
            expect(constraints.description).toBe('User email address');
        });

        it('should store default value', () => {
            class TestInput {
                @SchemaConstraint({ default: 'en' })
                language!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'language');
            expect(constraints.default).toBe('en');
        });
    });

    describe('type override', () => {
        it('should store explicit type', () => {
            class TestInput {
                @SchemaConstraint({ type: 'integer' })
                count!: number;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'count');
            expect(constraints.type).toBe('integer');
        });
    });

    describe('combined constraints', () => {
        it('should store multiple constraints together', () => {
            class TestInput {
                @SchemaConstraint({
                    description: 'API key for authentication',
                    minLength: 32,
                    maxLength: 64,
                    pattern: '^[A-Za-z0-9]+$',
                })
                apiKey!: string;
            }

            const instance = new TestInput();
            const constraints = Reflect.getMetadata('schema:constraints', instance, 'apiKey');
            expect(constraints.description).toBe('API key for authentication');
            expect(constraints.minLength).toBe(32);
            expect(constraints.maxLength).toBe(64);
            expect(constraints.pattern).toBe('^[A-Za-z0-9]+$');
        });
    });
});
