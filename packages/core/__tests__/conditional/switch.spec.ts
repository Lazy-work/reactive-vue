import { $switch } from "../../src";

describe('$match test suite', () => {
    it('should match primitive cases', () => {
        let input;
        let result;
        input = 0;
        result = $switch(input)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 'two')
            .default(null);


        expect(result).toBe('zero');

        input = 1;
        result = $switch(input)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 'two')
            .default(null);


        expect(result).toBe('one');

        input = 2;
        result = $switch(input)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 'two')
            .default(null);

        expect(result).toBe('two');

        input = -1;
        result = $switch(input)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 'two')
            .default(null);


        expect(result).toBe(null);
    })

    it('should match grouped primitive cases', () => {
        let result;
        result = $switch(0)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('zero');

        result = $switch(1)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('one');

        result = $switch(2)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);

        expect(result).toBe('2-5');

        result = $switch(3)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $switch(4)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $switch(5)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);


        expect(result).toBe('2-5');

        result = $switch(6)
            .case(0, 'zero')
            .case(1, 'one')
            .case(2, 3, 4, 5, '2-5')
            .default(null);

        expect(result).toBe(null);
    })
    it('should match pattern object deep equality', () => {
        interface ResponsePending {
            status: { value: 'pending' }
        }
        interface ResponseSuccess<T> {
            status: { value: 'success' },
            data: T,
        }

        interface ResponseError {
            status: { value: 'error' },
            error: Error,
        }
        type Response<T> = ResponsePending | ResponseSuccess<T> | ResponseError
        const error = {
            status: { value: "error" },
            error: new Error()
        } as Response<any>;

        const pending = {
            status: { value: 'pending' }
        }

        const success = {
            status: { value: 'success' },
            data: { foo: 'bar' }
        }

        const nope = { status: { value: 'nope' } };
        enum Result {
            SUCCESS,
            LOADING,
            ERROR
        }
        let result = $switch(pending)
            .case({ status: { value: 'success' } }, Result.SUCCESS)
            .case({ status: { value: "error" } }, Result.ERROR)
            .case({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);
        expect(result).toBe(Result.LOADING);


        result = $switch(error)
            .case({ status: { value: 'success' } }, Result.SUCCESS)
            .case({ status: { value: "error" } }, Result.ERROR)
            .case({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);


        expect(result).toBe(Result.ERROR);

        result = $switch(success)
            .case({ status: { value: 'success' } }, Result.SUCCESS)
            .case({ status: { value: "error" } }, Result.ERROR)
            .case({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);

        expect(result).toBe(Result.SUCCESS);


        result = $switch(nope)
            .case({ status: { value: 'success' } }, Result.SUCCESS)
            .case({ status: { value: "error" } }, Result.ERROR)
            .case({ status: { value: 'pending' } }, Result.LOADING)
            .default(null);


        expect(result).toBe(null);
    })
    it('should match pattern object', () => {
        interface ResponsePending {
            status: 'pending'
        }
        interface ResponseSuccess<T> {
            status: 'success',
            data: T,
        }

        interface ResponseError {
            status: 'error',
            error: Error,
        }
        type Response<T> = ResponsePending | ResponseSuccess<T> | ResponseError
        const error = {
            status: "error",
            error: new Error()
        } as Response<any>;

        const pending = {
            status: 'pending'
        }

        const success = {
            status: 'success',
            data: { foo: 'bar' }
        }

        const nope = { status: 'nope' };
        enum Result {
            SUCCESS,
            LOADING,
            ERROR
        }
        let result = $switch(pending)
            .case({ status: 'success' }, Result.SUCCESS)
            .case({ status: 'error' }, Result.ERROR)
            .case({ status: 'pending' }, Result.LOADING)
            .default(null);
        expect(result).toBe(Result.LOADING);


        result = $switch(error)
            .case({ status: 'success' }, Result.SUCCESS)
            .case({ status: 'error' }, Result.ERROR)
            .case({ status: 'pending' }, Result.LOADING)
            .default(null);


        expect(result).toBe(Result.ERROR);

        result = $switch(success)
            .case({ status: 'success' }, Result.SUCCESS)
            .case({ status: 'error' }, Result.ERROR)
            .case({ status: 'pending' }, Result.LOADING)
            .default(null);

        expect(result).toBe(Result.SUCCESS);


        result = $switch(nope)
            .case({ status: 'success' }, Result.SUCCESS)
            .case({ status: 'error' }, Result.ERROR)
            .case({ status: 'pending' }, Result.LOADING)
            .default(null);


        expect(result).toBe(null);
    })

})