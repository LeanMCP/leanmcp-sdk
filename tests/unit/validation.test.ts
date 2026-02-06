import { describe, it, expect } from '@jest/globals';
import {
    validatePort,
    validatePath,
    validateServiceName,
    validateNonEmpty,
    validateUrl,
} from '../../packages/core/src/validation';

// ============================================================================
// validatePort Tests
// ============================================================================

describe('validatePort', () => {
    describe('valid ports', () => {
        it('should accept port 1 (minimum valid)', () => {
            expect(() => validatePort(1)).not.toThrow();
        });

        it('should accept port 80 (HTTP)', () => {
            expect(() => validatePort(80)).not.toThrow();
        });

        it('should accept port 443 (HTTPS)', () => {
            expect(() => validatePort(443)).not.toThrow();
        });

        it('should accept port 3000 (common dev port)', () => {
            expect(() => validatePort(3000)).not.toThrow();
        });

        it('should accept port 8080 (common dev port)', () => {
            expect(() => validatePort(8080)).not.toThrow();
        });

        it('should accept port 65535 (maximum valid)', () => {
            expect(() => validatePort(65535)).not.toThrow();
        });
    });

    describe('invalid ports', () => {
        it('should reject port 0', () => {
            expect(() => validatePort(0)).toThrow('Invalid port: 0. Must be an integer between 1-65535');
        });

        it('should reject negative ports', () => {
            expect(() => validatePort(-1)).toThrow(
                'Invalid port: -1. Must be an integer between 1-65535'
            );
            expect(() => validatePort(-100)).toThrow(
                'Invalid port: -100. Must be an integer between 1-65535'
            );
        });

        it('should reject ports greater than 65535', () => {
            expect(() => validatePort(65536)).toThrow(
                'Invalid port: 65536. Must be an integer between 1-65535'
            );
            expect(() => validatePort(70000)).toThrow(
                'Invalid port: 70000. Must be an integer between 1-65535'
            );
        });

        it('should reject non-integer values', () => {
            expect(() => validatePort(3.14)).toThrow(
                'Invalid port: 3.14. Must be an integer between 1-65535'
            );
            expect(() => validatePort(80.5)).toThrow(
                'Invalid port: 80.5. Must be an integer between 1-65535'
            );
        });

        it('should reject NaN', () => {
            expect(() => validatePort(NaN)).toThrow(
                'Invalid port: NaN. Must be an integer between 1-65535'
            );
        });

        it('should reject Infinity', () => {
            expect(() => validatePort(Infinity)).toThrow(
                'Invalid port: Infinity. Must be an integer between 1-65535'
            );
        });
    });
});

// ============================================================================
// validatePath Tests
// ============================================================================

describe('validatePath', () => {
    describe('valid paths', () => {
        it('should accept relative paths', () => {
            expect(() => validatePath('./services')).not.toThrow();
            expect(() => validatePath('./mcp/example')).not.toThrow();
        });

        it('should accept simple directory names', () => {
            expect(() => validatePath('mcp')).not.toThrow();
            expect(() => validatePath('services')).not.toThrow();
        });

        it('should accept nested paths', () => {
            expect(() => validatePath('mcp/example/service')).not.toThrow();
            expect(() => validatePath('packages/core/src')).not.toThrow();
        });

        it('should accept paths with dots in filenames', () => {
            expect(() => validatePath('./config.json')).not.toThrow();
            expect(() => validatePath('file.test.ts')).not.toThrow();
        });
    });

    describe('invalid paths (path traversal)', () => {
        it('should reject paths with ".."', () => {
            expect(() => validatePath('../etc/passwd')).toThrow(
                'Invalid path: ../etc/passwd. Path traversal patterns are not allowed'
            );
        });

        it('should reject paths with ".." in the middle', () => {
            expect(() => validatePath('./mcp/../../../etc')).toThrow(
                'Invalid path: ./mcp/../../../etc. Path traversal patterns are not allowed'
            );
        });

        it('should reject paths starting with "~"', () => {
            expect(() => validatePath('~/secrets')).toThrow(
                'Invalid path: ~/secrets. Path traversal patterns are not allowed'
            );
        });

        it('should reject paths with "~" in the middle', () => {
            expect(() => validatePath('/home/~user/data')).toThrow(
                'Invalid path: /home/~user/data. Path traversal patterns are not allowed'
            );
        });

        it('should reject combined traversal attempts', () => {
            expect(() => validatePath('~/../etc/passwd')).toThrow(
                'Invalid path: ~/../etc/passwd. Path traversal patterns are not allowed'
            );
        });
    });
});

// ============================================================================
// validateServiceName Tests
// ============================================================================

describe('validateServiceName', () => {
    describe('valid service names', () => {
        it('should accept lowercase letters', () => {
            expect(() => validateServiceName('weather')).not.toThrow();
            expect(() => validateServiceName('myservice')).not.toThrow();
        });

        it('should accept uppercase letters', () => {
            expect(() => validateServiceName('Weather')).not.toThrow();
            expect(() => validateServiceName('MyService')).not.toThrow();
        });

        it('should accept numbers', () => {
            expect(() => validateServiceName('service123')).not.toThrow();
            expect(() => validateServiceName('123service')).not.toThrow();
        });

        it('should accept hyphens', () => {
            expect(() => validateServiceName('my-service')).not.toThrow();
            expect(() => validateServiceName('weather-api')).not.toThrow();
        });

        it('should accept underscores', () => {
            expect(() => validateServiceName('my_service')).not.toThrow();
            expect(() => validateServiceName('my_service_123')).not.toThrow();
        });

        it('should accept mixed valid characters', () => {
            expect(() => validateServiceName('My-Service_123')).not.toThrow();
        });
    });

    describe('invalid service names', () => {
        it('should reject names with spaces', () => {
            expect(() => validateServiceName('my service')).toThrow(
                'Invalid service name: my service. Service names must contain only alphanumeric characters, hyphens, and underscores'
            );
        });

        it('should reject names with special characters', () => {
            expect(() => validateServiceName('my@service')).toThrow(/Invalid service name/);
            expect(() => validateServiceName('my#service')).toThrow(/Invalid service name/);
            expect(() => validateServiceName('my$service')).toThrow(/Invalid service name/);
            expect(() => validateServiceName('my!service')).toThrow(/Invalid service name/);
        });

        it('should reject names with path separators', () => {
            expect(() => validateServiceName('my/service')).toThrow(/Invalid service name/);
            expect(() => validateServiceName('my\\service')).toThrow(/Invalid service name/);
        });

        it('should reject names with path traversal patterns', () => {
            expect(() => validateServiceName('../malicious')).toThrow(/Invalid service name/);
            expect(() => validateServiceName('..\\malicious')).toThrow(/Invalid service name/);
        });

        it('should reject names with dots', () => {
            expect(() => validateServiceName('my.service')).toThrow(/Invalid service name/);
        });
    });
});

// ============================================================================
// validateNonEmpty Tests
// ============================================================================

describe('validateNonEmpty', () => {
    describe('valid non-empty strings', () => {
        it('should accept regular strings', () => {
            expect(() => validateNonEmpty('hello', 'name')).not.toThrow();
            expect(() => validateNonEmpty('test value', 'field')).not.toThrow();
        });

        it('should accept single character strings', () => {
            expect(() => validateNonEmpty('a', 'name')).not.toThrow();
        });

        it('should accept strings with leading/trailing spaces (but content)', () => {
            expect(() => validateNonEmpty('  hello  ', 'name')).not.toThrow();
        });
    });

    describe('invalid empty strings', () => {
        it('should reject empty string', () => {
            expect(() => validateNonEmpty('', 'name')).toThrow('name cannot be empty');
        });

        it('should reject whitespace-only strings', () => {
            expect(() => validateNonEmpty('   ', 'description')).toThrow('description cannot be empty');
            expect(() => validateNonEmpty('\t\t', 'value')).toThrow('value cannot be empty');
            expect(() => validateNonEmpty('\n\n', 'content')).toThrow('content cannot be empty');
        });

        it('should use provided field name in error message', () => {
            expect(() => validateNonEmpty('', 'customField')).toThrow('customField cannot be empty');
            expect(() => validateNonEmpty('', 'API Key')).toThrow('API Key cannot be empty');
        });
    });
});

// ============================================================================
// validateUrl Tests
// ============================================================================

describe('validateUrl', () => {
    describe('valid URLs with default protocols', () => {
        it('should accept HTTPS URLs', () => {
            expect(() => validateUrl('https://example.com')).not.toThrow();
            expect(() => validateUrl('https://api.example.com/v1')).not.toThrow();
            expect(() => validateUrl('https://example.com:8443/path')).not.toThrow();
        });

        it('should accept HTTP URLs', () => {
            expect(() => validateUrl('http://example.com')).not.toThrow();
            expect(() => validateUrl('http://localhost:3000')).not.toThrow();
            expect(() => validateUrl('http://192.168.1.1:8080')).not.toThrow();
        });

        it('should accept URLs with query parameters', () => {
            expect(() => validateUrl('https://example.com?foo=bar')).not.toThrow();
            expect(() => validateUrl('https://example.com/path?a=1&b=2')).not.toThrow();
        });

        it('should accept URLs with fragments', () => {
            expect(() => validateUrl('https://example.com#section')).not.toThrow();
            expect(() => validateUrl('https://example.com/page#top')).not.toThrow();
        });
    });

    describe('invalid URLs', () => {
        it('should reject file:// protocol by default', () => {
            expect(() => validateUrl('file:///etc/passwd')).toThrow(
                'Invalid URL protocol: file:. Allowed protocols: http:, https:'
            );
        });

        it('should reject javascript: protocol', () => {
            expect(() => validateUrl('javascript:alert(1)')).toThrow(/Invalid URL protocol: javascript:/);
        });

        it('should reject data: protocol', () => {
            expect(() => validateUrl('data:text/html,<script>alert(1)</script>')).toThrow(
                /Invalid URL protocol: data:/
            );
        });

        it('should reject malformed URLs', () => {
            expect(() => validateUrl('not-a-url')).toThrow(/Invalid URL/);
            expect(() => validateUrl('://missing-protocol')).toThrow(/Invalid URL/);
        });

        it('should reject empty string', () => {
            expect(() => validateUrl('')).toThrow(/Invalid URL/);
        });
    });

    describe('with custom allowed protocols', () => {
        it('should accept custom protocols when specified', () => {
            expect(() => validateUrl('ftp://example.com', ['ftp:'])).not.toThrow();
            expect(() => validateUrl('ws://example.com', ['ws:', 'wss:'])).not.toThrow();
            expect(() => validateUrl('wss://example.com', ['ws:', 'wss:'])).not.toThrow();
        });

        it('should reject non-allowed protocols with custom list', () => {
            expect(() => validateUrl('https://example.com', ['ftp:'])).toThrow(
                'Invalid URL protocol: https:. Allowed protocols: ftp:'
            );
        });

        it('should work with multiple custom protocols', () => {
            const protocols = ['http:', 'https:', 'ftp:'];
            expect(() => validateUrl('http://example.com', protocols)).not.toThrow();
            expect(() => validateUrl('https://example.com', protocols)).not.toThrow();
            expect(() => validateUrl('ftp://example.com', protocols)).not.toThrow();
            expect(() => validateUrl('ws://example.com', protocols)).toThrow(/Invalid URL protocol/);
        });
    });
});
