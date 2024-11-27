import { $if } from '../../src/conditional'

describe('$if test suite', () => {
    it('should return true on value greater than 5', () => {
        const value = 10;
        const result = $if(value > 5)
            .then(true)
            .else(false)
            .end();
        expect(result).toBe(true);
    })

    it('should return false on value lower than 5', () => {
        const value = 4;
        const result = $if(value > 5)
            .then(true)
            .else(false)
            .end();
        expect(result).toBe(false);
    })

    it('should evaluate the second condition on first condition not meet', () => {
        const value = 5;
        const result = $if(value > 5)
            .then(true)
            .elseif(value === 5, null)
            .else(false)
            .end();
        expect(result).toBe(null);
    })

    it('should return the "else" value after several falsy conditions', () => {
        const value: number = 0;
        const result = $if(value > 5)
            .then(true)
            .elseif(value === 5, null)
            .elseif(value < -1, 'negative')
            .else(false)
            .end();
        expect(result).toBe(false);
    })
    it('should return the "else" value after several falsy conditions', () => {
        const value: number = -5;
        const result = $if(value > 5)
            .then(true)
            .elseif(value === 5, null)
            .elseif(value < -1, 'negative')
            .elseif(value === 0, 'zero')
            .else(false)
            .end();
        expect(result).toBe('negative');
    })
})

