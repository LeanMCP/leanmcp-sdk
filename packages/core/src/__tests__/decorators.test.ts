import 'reflect-metadata';
import {
    Tool,
    Prompt,
    Resource,
    Auth,
    UserEnvs,
    UI,
    Render,
    Deprecated,
    getMethodMetadata,
    getDecoratedMethods
} from '../decorators';

// ============================================================================
// @Tool Decorator
// ============================================================================

describe('@Tool', () => {
    test('should set tool name from method name', () => {
        class TestService {
            @Tool()
            async myTool() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myTool')!;
        expect(Reflect.getMetadata('tool:name', descriptor.value)).toBe('myTool');
    });

    test('should set tool description', () => {
        class TestService {
            @Tool({ description: 'Analyze text sentiment' })
            async analyzeSentiment() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'analyzeSentiment')!;
        expect(Reflect.getMetadata('tool:description', descriptor.value)).toBe('Analyze text sentiment');
    });

    test('should default description to empty string', () => {
        class TestService {
            @Tool()
            async noDesc() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'noDesc')!;
        expect(Reflect.getMetadata('tool:description', descriptor.value)).toBe('');
    });

    test('should store inputClass when provided', () => {
        class MyInput {
            text!: string;
        }

        class TestService {
            @Tool({ description: 'Test', inputClass: MyInput })
            async withInput(args: MyInput) { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'withInput')!;
        expect(Reflect.getMetadata('tool:inputClass', descriptor.value)).toBe(MyInput);
    });

    test('should not set inputClass when not provided', () => {
        class TestService {
            @Tool()
            async noInput() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'noInput')!;
        expect(Reflect.getMetadata('tool:inputClass', descriptor.value)).toBeUndefined();
    });

    test('should store securitySchemes when provided', () => {
        class TestService {
            @Tool({
                description: 'Secure tool',
                securitySchemes: [{ type: 'oauth2', scopes: ['read:user'] }]
            })
            async secureTool() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'secureTool')!;
        const schemes = Reflect.getMetadata('tool:securitySchemes', descriptor.value);
        expect(schemes).toEqual([{ type: 'oauth2', scopes: ['read:user'] }]);
    });

    test('should store propertyKey', () => {
        class TestService {
            @Tool()
            async myMethod() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myMethod')!;
        expect(Reflect.getMetadata('tool:propertyKey', descriptor.value)).toBe('myMethod');
    });
});

// ============================================================================
// @Prompt Decorator
// ============================================================================

describe('@Prompt', () => {
    test('should set prompt name from method name', () => {
        class TestService {
            @Prompt()
            greetingPrompt() { return { messages: [] }; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'greetingPrompt')!;
        expect(Reflect.getMetadata('prompt:name', descriptor.value)).toBe('greetingPrompt');
    });

    test('should set prompt description', () => {
        class TestService {
            @Prompt({ description: 'Generate greeting' })
            greeting() { return { messages: [] }; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'greeting')!;
        expect(Reflect.getMetadata('prompt:description', descriptor.value)).toBe('Generate greeting');
    });

    test('should store inputClass when provided', () => {
        class PromptInput {
            name!: string;
        }

        class TestService {
            @Prompt({ description: 'Test', inputClass: PromptInput })
            myPrompt(args: PromptInput) { return { messages: [] }; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myPrompt')!;
        expect(Reflect.getMetadata('prompt:inputClass', descriptor.value)).toBe(PromptInput);
    });

    test('should store propertyKey', () => {
        class TestService {
            @Prompt()
            myPrompt() { return { messages: [] }; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myPrompt')!;
        expect(Reflect.getMetadata('prompt:propertyKey', descriptor.value)).toBe('myPrompt');
    });
});

// ============================================================================
// @Resource Decorator
// ============================================================================

describe('@Resource', () => {
    test('should set resource name from method name', () => {
        class TestService {
            @Resource()
            getStats() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getStats')!;
        expect(Reflect.getMetadata('resource:name', descriptor.value)).toBe('getStats');
    });

    test('should auto-generate ui:// URI from class and method name', () => {
        class ProductSearchService {
            @Resource()
            getCatalog() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(ProductSearchService.prototype, 'getCatalog')!;
        // Class name "ProductSearchService" → "productsearch" (lowercased, "service" removed)
        expect(Reflect.getMetadata('resource:uri', descriptor.value)).toBe('ui://productsearch/getCatalog');
    });

    test('should allow custom URI override', () => {
        class TestService {
            @Resource({ uri: 'custom://my-resource' })
            myResource() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myResource')!;
        expect(Reflect.getMetadata('resource:uri', descriptor.value)).toBe('custom://my-resource');
    });

    test('should set description', () => {
        class TestService {
            @Resource({ description: 'Server info' })
            serverInfo() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'serverInfo')!;
        expect(Reflect.getMetadata('resource:description', descriptor.value)).toBe('Server info');
    });

    test('should set mimeType', () => {
        class TestService {
            @Resource({ mimeType: 'text/plain' })
            getText() { return 'hello'; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getText')!;
        expect(Reflect.getMetadata('resource:mimeType', descriptor.value)).toBe('text/plain');
    });

    test('should default mimeType to application/json', () => {
        class TestService {
            @Resource()
            getData() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getData')!;
        expect(Reflect.getMetadata('resource:mimeType', descriptor.value)).toBe('application/json');
    });

    test('should store inputClass when provided', () => {
        class ResourceInput {
            id!: string;
        }

        class TestService {
            @Resource({ inputClass: ResourceInput })
            getById(args: ResourceInput) { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getById')!;
        expect(Reflect.getMetadata('resource:inputClass', descriptor.value)).toBe(ResourceInput);
    });
});

// ============================================================================
// @Auth Decorator
// ============================================================================

describe('@Auth', () => {
    test('should set auth metadata on method', () => {
        class TestService {
            @Auth({ provider: 'clerk' })
            async protectedMethod() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'protectedMethod')!;
        expect(Reflect.getMetadata('auth:provider', descriptor.value)).toBe('clerk');
        expect(Reflect.getMetadata('auth:required', descriptor.value)).toBe(true);
    });

    test('should set auth metadata on class', () => {
        @Auth({ provider: 'cognito' })
        class ProtectedService {
            async method() { return {}; }
        }

        expect(Reflect.getMetadata('auth:provider', ProtectedService)).toBe('cognito');
        expect(Reflect.getMetadata('auth:required', ProtectedService)).toBe(true);
    });
});

// ============================================================================
// @UserEnvs Decorator
// ============================================================================

describe('@UserEnvs', () => {
    test('should store property key on constructor', () => {
        class TestService {
            @UserEnvs()
            envConfig: any;
        }

        expect(Reflect.getMetadata('userenvs:propertyKey', TestService)).toBe('envConfig');
    });
});

// ============================================================================
// @UI Decorator
// ============================================================================

describe('@UI', () => {
    test('should set UI component on method', () => {
        class TestService {
            @UI('DataGrid')
            async getData() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getData')!;
        expect(Reflect.getMetadata('ui:component', descriptor.value)).toBe('DataGrid');
    });

    test('should set UI component on class', () => {
        @UI('Dashboard')
        class DashboardService {
            async getData() { return {}; }
        }

        expect(Reflect.getMetadata('ui:component', DashboardService)).toBe('Dashboard');
    });
});

// ============================================================================
// @Render Decorator
// ============================================================================

describe('@Render', () => {
    test('should set render format', () => {
        class TestService {
            @Render('markdown')
            async getReport() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'getReport')!;
        expect(Reflect.getMetadata('render:format', descriptor.value)).toBe('markdown');
    });

    test('should support all format types', () => {
        const formats = ['markdown', 'html', 'json', 'chart', 'table'] as const;

        for (const format of formats) {
            class TestService {
                @Render(format)
                async method() { return {}; }
            }

            const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'method')!;
            expect(Reflect.getMetadata('render:format', descriptor.value)).toBe(format);
        }
    });
});

// ============================================================================
// @Deprecated Decorator
// ============================================================================

describe('@Deprecated', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    test('should wrap method to log deprecation warning with custom message', () => {
        class TestService {
            @Deprecated('Use newMethod instead')
            async oldMethod() { return {}; }
        }

        const service = new TestService();
        service.oldMethod();

        expect(warnSpy).toHaveBeenCalledWith('DEPRECATED: oldMethod - Use newMethod instead');
    });

    test('should use default deprecation message when none provided', () => {
        class TestService {
            @Deprecated()
            async oldMethod() { return {}; }
        }

        const service = new TestService();
        service.oldMethod();

        expect(warnSpy).toHaveBeenCalledWith('DEPRECATED: oldMethod - This feature is deprecated');
    });

    test('should still execute the original method and return its result', async () => {
        class TestService {
            @Deprecated()
            async oldMethod() { return { value: 42 }; }
        }

        const service = new TestService();
        const result = await service.oldMethod();
        expect(result).toEqual({ value: 42 });
    });

    test('should set deprecation metadata on class', () => {
        @Deprecated('This service is deprecated')
        class OldService {
            async method() { return {}; }
        }

        expect(Reflect.getMetadata('deprecated:true', OldService)).toBe(true);
        expect(Reflect.getMetadata('deprecated:message', OldService)).toBe('This service is deprecated');
    });
});

// ============================================================================
// getMethodMetadata()
// ============================================================================

describe('getMethodMetadata', () => {
    test('should return all metadata for a decorated method', () => {
        class TestService {
            @Tool({ description: 'My tool' })
            @Render('json')
            async myTool() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myTool')!;
        const meta = getMethodMetadata(descriptor.value as Function);

        expect(meta.toolName).toBe('myTool');
        expect(meta.toolDescription).toBe('My tool');
        expect(meta.renderFormat).toBe('json');
    });

    test('should return undefined for unset metadata', () => {
        class TestService {
            @Tool()
            async myTool() { return {}; }
        }

        const descriptor = Object.getOwnPropertyDescriptor(TestService.prototype, 'myTool')!;
        const meta = getMethodMetadata(descriptor.value as Function);

        expect(meta.toolName).toBe('myTool');
        expect(meta.promptName).toBeUndefined();
        expect(meta.resourceUri).toBeUndefined();
        expect(meta.authProvider).toBeUndefined();
    });
});

// ============================================================================
// getDecoratedMethods()
// ============================================================================

describe('getDecoratedMethods', () => {
    test('should find all @Tool methods on a class', () => {
        class TestService {
            @Tool({ description: 'Tool A' })
            async toolA() { return {}; }

            @Tool({ description: 'Tool B' })
            async toolB() { return {}; }

            async notATool() { return {}; }
        }

        const tools = getDecoratedMethods(TestService, 'tool:name');
        expect(tools).toHaveLength(2);
        expect(tools.map(t => t.propertyKey)).toContain('toolA');
        expect(tools.map(t => t.propertyKey)).toContain('toolB');
    });

    test('should find @Prompt methods', () => {
        class TestService {
            @Prompt({ description: 'A prompt' })
            myPrompt() { return { messages: [] }; }

            @Tool()
            async myTool() { return {}; }
        }

        const prompts = getDecoratedMethods(TestService, 'prompt:name');
        expect(prompts).toHaveLength(1);
        expect(prompts[0].propertyKey).toBe('myPrompt');
    });

    test('should find @Resource methods', () => {
        class TestService {
            @Resource({ description: 'A resource' })
            myResource() { return {}; }

            @Resource({ description: 'Another resource' })
            anotherResource() { return {}; }
        }

        const resources = getDecoratedMethods(TestService, 'resource:uri');
        expect(resources).toHaveLength(2);
    });

    test('should return empty array when no decorated methods found', () => {
        class TestService {
            async plainMethod() { return {}; }
        }

        const tools = getDecoratedMethods(TestService, 'tool:name');
        expect(tools).toHaveLength(0);
    });
});
