import 'reflect-metadata';
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Tool,
  Prompt,
  Resource,
  Auth,
  UI,
  Render,
  Deprecated,
  UserEnvs,
  getMethodMetadata,
  getDecoratedMethods,
} from '../../packages/core/src/decorators';

// ============================================================================
// @Tool Decorator Tests
// ============================================================================

describe('@Tool Decorator', () => {
  describe('basic functionality', () => {
    class TestService {
      @Tool({ description: 'Test tool description' })
      async testTool() {
        return { result: 'success' };
      }

      @Tool({})
      async toolWithoutDescription() {
        return { result: 'no description' };
      }
    }

    it('should set tool name from method name', () => {
      const service = new TestService();
      const toolName = Reflect.getMetadata('tool:name', service.testTool);
      expect(toolName).toBe('testTool');
    });

    it('should set tool description', () => {
      const service = new TestService();
      const description = Reflect.getMetadata('tool:description', service.testTool);
      expect(description).toBe('Test tool description');
    });

    it('should set empty description when not provided', () => {
      const service = new TestService();
      const description = Reflect.getMetadata('tool:description', service.toolWithoutDescription);
      expect(description).toBe('');
    });

    it('should set propertyKey metadata', () => {
      const service = new TestService();
      const propertyKey = Reflect.getMetadata('tool:propertyKey', service.testTool);
      expect(propertyKey).toBe('testTool');
    });
  });

  describe('with inputClass', () => {
    class MyInput {
      text!: string;
    }

    class TestService {
      @Tool({ description: 'Tool with input', inputClass: MyInput })
      async toolWithInput(args: MyInput) {
        return { result: args.text };
      }
    }

    it('should store inputClass when provided', () => {
      const service = new TestService();
      const inputClass = Reflect.getMetadata('tool:inputClass', service.toolWithInput);
      expect(inputClass).toBe(MyInput);
    });
  });

  describe('with securitySchemes', () => {
    class TestService {
      @Tool({
        description: 'Protected tool',
        securitySchemes: [{ type: 'oauth2', scopes: ['read:user'] }],
      })
      async protectedTool() {
        return { result: 'protected' };
      }

      @Tool({
        description: 'Anonymous tool',
        securitySchemes: [{ type: 'noauth' }],
      })
      async anonymousTool() {
        return { result: 'anonymous' };
      }
    }

    it('should store oauth2 security scheme', () => {
      const service = new TestService();
      const schemes = Reflect.getMetadata('tool:securitySchemes', service.protectedTool);
      expect(schemes).toEqual([{ type: 'oauth2', scopes: ['read:user'] }]);
    });

    it('should store noauth security scheme', () => {
      const service = new TestService();
      const schemes = Reflect.getMetadata('tool:securitySchemes', service.anonymousTool);
      expect(schemes).toEqual([{ type: 'noauth' }]);
    });
  });
});

// ============================================================================
// @Prompt Decorator Tests
// ============================================================================

describe('@Prompt Decorator', () => {
  describe('basic functionality', () => {
    class TestService {
      @Prompt({ description: 'Test prompt' })
      testPrompt() {
        return { messages: [{ role: 'user', content: { type: 'text', text: 'Hello' } }] };
      }

      @Prompt({})
      promptWithoutDescription() {
        return { messages: [] };
      }
    }

    it('should set prompt name from method name', () => {
      const service = new TestService();
      const promptName = Reflect.getMetadata('prompt:name', service.testPrompt);
      expect(promptName).toBe('testPrompt');
    });

    it('should set prompt description', () => {
      const service = new TestService();
      const description = Reflect.getMetadata('prompt:description', service.testPrompt);
      expect(description).toBe('Test prompt');
    });

    it('should set empty description when not provided', () => {
      const service = new TestService();
      const description = Reflect.getMetadata('prompt:description', service.promptWithoutDescription);
      expect(description).toBe('');
    });
  });

  describe('with inputClass', () => {
    class PromptInput {
      name!: string;
    }

    class TestService {
      @Prompt({ description: 'Prompt with input', inputClass: PromptInput })
      promptWithInput(args: PromptInput) {
        return { messages: [{ role: 'user', content: { type: 'text', text: args.name } }] };
      }
    }

    it('should store inputClass when provided', () => {
      const service = new TestService();
      const inputClass = Reflect.getMetadata('prompt:inputClass', service.promptWithInput);
      expect(inputClass).toBe(PromptInput);
    });
  });
});

// ============================================================================
// @Resource Decorator Tests
// ============================================================================

describe('@Resource Decorator', () => {
  describe('basic functionality', () => {
    class TestService {
      @Resource({ description: 'Test resource' })
      getResource() {
        return { data: 'test' };
      }

      @Resource({ description: 'With mime type', mimeType: 'text/plain' })
      getTextResource() {
        return 'plain text';
      }
    }

    it('should generate URI using ui:// scheme', () => {
      const service = new TestService();
      const uri = Reflect.getMetadata('resource:uri', service.getResource);
      expect(uri).toBe('ui://test/getResource');
    });

    it('should set resource name from method name', () => {
      const service = new TestService();
      const name = Reflect.getMetadata('resource:name', service.getResource);
      expect(name).toBe('getResource');
    });

    it('should set resource description', () => {
      const service = new TestService();
      const description = Reflect.getMetadata('resource:description', service.getResource);
      expect(description).toBe('Test resource');
    });

    it('should default mimeType to application/json', () => {
      const service = new TestService();
      const mimeType = Reflect.getMetadata('resource:mimeType', service.getResource);
      expect(mimeType).toBe('application/json');
    });

    it('should use custom mimeType when provided', () => {
      const service = new TestService();
      const mimeType = Reflect.getMetadata('resource:mimeType', service.getTextResource);
      expect(mimeType).toBe('text/plain');
    });
  });

  describe('with custom URI', () => {
    class TestService {
      @Resource({ description: 'Custom URI', uri: 'custom://my/resource' })
      customResource() {
        return { data: 'custom' };
      }
    }

    it('should use explicit URI when provided', () => {
      const service = new TestService();
      const uri = Reflect.getMetadata('resource:uri', service.customResource);
      expect(uri).toBe('custom://my/resource');
    });
  });

  describe('with inputClass', () => {
    class ResourceInput {
      id!: string;
    }

    class TestService {
      @Resource({ description: 'Resource with input', inputClass: ResourceInput })
      resourceWithInput(args: ResourceInput) {
        return { id: args.id };
      }
    }

    it('should store inputClass when provided', () => {
      const service = new TestService();
      const inputClass = Reflect.getMetadata('resource:inputClass', service.resourceWithInput);
      expect(inputClass).toBe(ResourceInput);
    });
  });
});

// ============================================================================
// @Auth Decorator Tests
// ============================================================================

describe('@Auth Decorator', () => {
  describe('as method decorator', () => {
    class TestService {
      @Auth({ provider: 'clerk' })
      async protectedMethod() {
        return { result: 'protected' };
      }
    }

    it('should set auth provider on method', () => {
      const service = new TestService();
      const provider = Reflect.getMetadata('auth:provider', service.protectedMethod);
      expect(provider).toBe('clerk');
    });

    it('should set auth required flag on method', () => {
      const service = new TestService();
      const required = Reflect.getMetadata('auth:required', service.protectedMethod);
      expect(required).toBe(true);
    });
  });

  describe('as class decorator', () => {
    @Auth({ provider: 'auth0' })
    class ProtectedService {
      async method1() {
        return { result: 'method1' };
      }
    }

    it('should set auth provider on class', () => {
      const provider = Reflect.getMetadata('auth:provider', ProtectedService);
      expect(provider).toBe('auth0');
    });

    it('should set auth required flag on class', () => {
      const required = Reflect.getMetadata('auth:required', ProtectedService);
      expect(required).toBe(true);
    });
  });
});

// ============================================================================
// @UI Decorator Tests
// ============================================================================

describe('@UI Decorator', () => {
  describe('as method decorator', () => {
    class TestService {
      @UI('dashboard-widget')
      async widgetMethod() {
        return { data: 'widget' };
      }
    }

    it('should set UI component on method', () => {
      const service = new TestService();
      const component = Reflect.getMetadata('ui:component', service.widgetMethod);
      expect(component).toBe('dashboard-widget');
    });
  });

  describe('as class decorator', () => {
    @UI('full-page-app')
    class UIService {
      async method() {
        return {};
      }
    }

    it('should set UI component on class', () => {
      const component = Reflect.getMetadata('ui:component', UIService);
      expect(component).toBe('full-page-app');
    });
  });
});

// ============================================================================
// @Render Decorator Tests
// ============================================================================

describe('@Render Decorator', () => {
  class TestService {
    @Render('markdown')
    markdownMethod() {
      return '# Hello';
    }

    @Render('html')
    htmlMethod() {
      return '<h1>Hello</h1>';
    }

    @Render('json')
    jsonMethod() {
      return { data: 'json' };
    }

    @Render('table')
    tableMethod() {
      return [{ a: 1 }, { a: 2 }];
    }

    @Render('chart')
    chartMethod() {
      return { type: 'bar', data: [] };
    }
  }

  it('should set render format to markdown', () => {
    const service = new TestService();
    const format = Reflect.getMetadata('render:format', service.markdownMethod);
    expect(format).toBe('markdown');
  });

  it('should set render format to html', () => {
    const service = new TestService();
    const format = Reflect.getMetadata('render:format', service.htmlMethod);
    expect(format).toBe('html');
  });

  it('should set render format to json', () => {
    const service = new TestService();
    const format = Reflect.getMetadata('render:format', service.jsonMethod);
    expect(format).toBe('json');
  });

  it('should set render format to table', () => {
    const service = new TestService();
    const format = Reflect.getMetadata('render:format', service.tableMethod);
    expect(format).toBe('table');
  });

  it('should set render format to chart', () => {
    const service = new TestService();
    const format = Reflect.getMetadata('render:format', service.chartMethod);
    expect(format).toBe('chart');
  });
});

// ============================================================================
// @Deprecated Decorator Tests
// ============================================================================

describe('@Deprecated Decorator', () => {
  // Suppress console.warn for these tests
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('as method decorator', () => {
    class TestService {
      @Deprecated('Use newMethod instead')
      async oldMethod() {
        return { result: 'old' };
      }

      @Deprecated()
      async deprecatedWithoutMessage() {
        return { result: 'deprecated' };
      }
    }

    it('should log warning with custom message when deprecated method is called', async () => {
      const service = new TestService();
      await service.oldMethod();
      expect(consoleWarnSpy).toHaveBeenCalledWith('DEPRECATED: oldMethod - Use newMethod instead');
    });

    it('should log warning with default message when deprecated method is called', async () => {
      const service = new TestService();
      await service.deprecatedWithoutMessage();
      expect(consoleWarnSpy).toHaveBeenCalledWith('DEPRECATED: deprecatedWithoutMessage - This feature is deprecated');
    });

    it('should still execute the method and return result', async () => {
      const service = new TestService();
      const result = await service.oldMethod();
      expect(result).toEqual({ result: 'old' });
    });
  });

  describe('as class decorator', () => {
    it('should set deprecated flag on class', () => {
      @Deprecated('Use NewService instead')
      class OldService { }

      const deprecated = Reflect.getMetadata('deprecated:true', OldService);
      expect(deprecated).toBe(true);
    });

    it('should set deprecation message on class', () => {
      @Deprecated('Use NewService instead')
      class OldService { }

      const message = Reflect.getMetadata('deprecated:message', OldService);
      expect(message).toBe('Use NewService instead');
    });

    it('should log warning when class is decorated', () => {
      @Deprecated('Legacy class')
      class LegacyService { }

      // Class decorator logs immediately on decoration
      expect(consoleWarnSpy).toHaveBeenCalledWith('DEPRECATED: LegacyService - Legacy class');
    });
  });
});

// ============================================================================
// @UserEnvs Decorator Tests
// ============================================================================

describe('@UserEnvs Decorator', () => {
  class TestService {
    @UserEnvs()
    envConfig: any;
  }

  it('should store property key for env injection', () => {
    const propertyKey = Reflect.getMetadata('userenvs:propertyKey', TestService);
    expect(propertyKey).toBe('envConfig');
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getMethodMetadata', () => {
  class TestService {
    @Tool({ description: 'Tool description' })
    @Auth({ provider: 'clerk' })
    @UI('widget')
    @Render('json')
    async fullFeaturedTool() {
      return {};
    }
  }

  it('should return complete metadata for a method', () => {
    const service = new TestService();
    const metadata = getMethodMetadata(service.fullFeaturedTool);

    expect(metadata.toolName).toBe('fullFeaturedTool');
    expect(metadata.toolDescription).toBe('Tool description');
    expect(metadata.authProvider).toBe('clerk');
    expect(metadata.authRequired).toBe(true);
    expect(metadata.uiComponent).toBe('widget');
    expect(metadata.renderFormat).toBe('json');
  });
});

describe('getDecoratedMethods', () => {
  class TestService {
    @Tool({ description: 'Tool 1' })
    async tool1() {
      return {};
    }

    @Tool({ description: 'Tool 2' })
    async tool2() {
      return {};
    }

    @Prompt({ description: 'Prompt 1' })
    prompt1() {
      return { messages: [] };
    }

    async regularMethod() {
      return {};
    }
  }

  it('should find all methods with tool decorator', () => {
    const tools = getDecoratedMethods(TestService, 'tool:name');
    expect(tools.length).toBe(2);
    expect(tools.map((t) => t.propertyKey).sort()).toEqual(['tool1', 'tool2']);
  });

  it('should find all methods with prompt decorator', () => {
    const prompts = getDecoratedMethods(TestService, 'prompt:name');
    expect(prompts.length).toBe(1);
    expect(prompts[0].propertyKey).toBe('prompt1');
  });

  it('should not include undecorated methods', () => {
    const tools = getDecoratedMethods(TestService, 'tool:name');
    const propertyKeys = tools.map((t) => t.propertyKey);
    expect(propertyKeys).not.toContain('regularMethod');
  });
});
