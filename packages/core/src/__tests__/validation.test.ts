import {
    validatePort,
    validatePath,
    validateServiceName,
    validateNonEmpty,
    validateUrl
} from '../validation';

// ============================================================================
// validatePort()
// ============================================================================

describe('validatePort', () => {
    test('should accept valid ports', () => {
        expect(() => validatePort(1)).not.toThrow();
        expect(() => validatePort(80)).not.toThrow();
        expect(() => validatePort(3000)).not.toThrow();
        expect(() => validatePort(8080)).not.toThrow();
        expect(() => validatePort(65535)).not.toThrow();
    });

    test('should reject port 0', () => {
        expect(() => validatePort(0)).toThrow('Invalid port');
    });

    test('should reject negative ports', () => {
        expect(() => validatePort(-1)).toThrow('Invalid port');
        expect(() => validatePort(-100)).toThrow('Invalid port');
    });

    test('should reject ports above 65535', () => {
        expect(() => validatePort(65536)).toThrow('Invalid port');
        expect(() => validatePort(70000)).toThrow('Invalid port');
    });

    test('should reject non-integer ports', () => {
        expect(() => validatePort(3.14)).toThrow('Invalid port');
        expect(() => validatePort(80.5)).toThrow('Invalid port');
    });

    test('should reject NaN', () => {
        expect(() => validatePort(NaN)).toThrow('Invalid port');
    });
});

// ============================================================================
// validatePath()
// ============================================================================

describe('validatePath', () => {
    test('should accept valid paths', () => {
        expect(() => validatePath('./services')).not.toThrow();
        expect(() => validatePath('mcp/products')).not.toThrow();
        expect(() => validatePath('/absolute/path')).not.toThrow();
        expect(() => validatePath('file.ts')).not.toThrow();
    });

    test('should reject directory traversal with ..', () => {
        expect(() => validatePath('../etc/passwd')).toThrow('Path traversal');
        expect(() => validatePath('foo/../bar')).toThrow('Path traversal');
        expect(() => validatePath('../../secret')).toThrow('Path traversal');
    });

    test('should reject home directory with ~', () => {
        expect(() => validatePath('~/secrets')).toThrow('Path traversal');
        expect(() => validatePath('~/.ssh/id_rsa')).toThrow('Path traversal');
    });
});

// ============================================================================
// validateServiceName()
// ============================================================================

describe('validateServiceName', () => {
    test('should accept valid service names', () => {
        expect(() => validateServiceName('my-service')).not.toThrow();
        expect(() => validateServiceName('my_service')).not.toThrow();
        expect(() => validateServiceName('service123')).not.toThrow();
        expect(() => validateServiceName('MyService')).not.toThrow();
        expect(() => validateServiceName('a')).not.toThrow();
    });

    test('should reject names with spaces', () => {
        expect(() => validateServiceName('my service')).toThrow('Invalid service name');
    });

    test('should reject names with special characters', () => {
        expect(() => validateServiceName('my.service')).toThrow('Invalid service name');
        expect(() => validateServiceName('my/service')).toThrow('Invalid service name');
        expect(() => validateServiceName('../malicious')).toThrow('Invalid service name');
        expect(() => validateServiceName('service@home')).toThrow('Invalid service name');
    });

    test('should reject empty string', () => {
        expect(() => validateServiceName('')).toThrow('Invalid service name');
    });
});

// ============================================================================
// validateNonEmpty()
// ============================================================================

describe('validateNonEmpty', () => {
    test('should accept non-empty strings', () => {
        expect(() => validateNonEmpty('hello', 'name')).not.toThrow();
        expect(() => validateNonEmpty('a', 'field')).not.toThrow();
        expect(() => validateNonEmpty('  text  ', 'value')).not.toThrow();
    });

    test('should reject empty string', () => {
        expect(() => validateNonEmpty('', 'name')).toThrow('name cannot be empty');
    });

    test('should reject whitespace-only string', () => {
        expect(() => validateNonEmpty('   ', 'field')).toThrow('field cannot be empty');
        expect(() => validateNonEmpty('\t\n', 'value')).toThrow('value cannot be empty');
    });

    test('should include field name in error message', () => {
        expect(() => validateNonEmpty('', 'serverName')).toThrow('serverName cannot be empty');
    });
});

// ============================================================================
// validateUrl()
// ============================================================================

describe('validateUrl', () => {
    test('should accept valid HTTP URLs', () => {
        expect(() => validateUrl('http://localhost:3000')).not.toThrow();
        expect(() => validateUrl('http://example.com')).not.toThrow();
    });

    test('should accept valid HTTPS URLs', () => {
        expect(() => validateUrl('https://example.com')).not.toThrow();
        expect(() => validateUrl('https://api.example.com/v1')).not.toThrow();
    });

    test('should reject file:// protocol by default', () => {
        expect(() => validateUrl('file:///etc/passwd')).toThrow('Invalid URL protocol');
    });

    test('should reject javascript: protocol', () => {
        expect(() => validateUrl('javascript:alert(1)')).toThrow();
    });

    test('should reject invalid URL strings', () => {
        expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
        expect(() => validateUrl('')).toThrow('Invalid URL');
    });

    test('should accept custom allowed protocols', () => {
        expect(() => validateUrl('ftp://files.example.com', ['ftp:'])).not.toThrow();
    });

    test('should reject non-allowed protocol in custom list', () => {
        expect(() => validateUrl('http://example.com', ['https:'])).toThrow('Invalid URL protocol');
    });
});
