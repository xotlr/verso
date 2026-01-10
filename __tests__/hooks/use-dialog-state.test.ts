import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDialogState } from '@/hooks/use-dialog-state';

describe('useDialogState', () => {
  describe('initial state', () => {
    it('should initialize with isLoading false', () => {
      const { result } = renderHook(() => useDialogState());
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with error null', () => {
      const { result } = renderHook(() => useDialogState());
      expect(result.current.error).toBeNull();
    });

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useDialogState());
      expect(typeof result.current.setIsLoading).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('setIsLoading', () => {
    it('should set loading state to true', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setIsLoading(true);
      });

      act(() => {
        result.current.setIsLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setError('Error message');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('execute', () => {
    it('should manage loading state during execution', async () => {
      const { result } = renderHook(() => useDialogState());

      // Initial state
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.execute(async () => {
          // Simulate async operation
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        });
      });

      // After completion, loading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to false after successful execution', async () => {
      const { result } = renderHook(() => useDialogState());

      await act(async () => {
        await result.current.execute(async () => {
          return 'result';
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should return result from successful execution', async () => {
      const { result } = renderHook(() => useDialogState());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute(async () => {
          return { data: 'test' };
        });
      });

      expect(returnValue).toEqual({ data: 'test' });
    });

    it('should clear any previous error before execution', async () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setError('Previous error');
      });

      expect(result.current.error).toBe('Previous error');

      await act(async () => {
        await result.current.execute(async () => 'success');
      });

      expect(result.current.error).toBeNull();
    });

    it('should catch errors and set error state', async () => {
      const { result } = renderHook(() => useDialogState());

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Operation failed');
        });
      });

      expect(result.current.error).toBe('Operation failed');
    });

    it('should return null when execution fails', async () => {
      const { result } = renderHook(() => useDialogState());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute(async () => {
          throw new Error('Failed');
        });
      });

      expect(returnValue).toBeNull();
    });

    it('should set loading to false after failed execution', async () => {
      const { result } = renderHook(() => useDialogState());

      await act(async () => {
        await result.current.execute(async () => {
          throw new Error('Error');
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      const { result } = renderHook(() => useDialogState());

      await act(async () => {
        await result.current.execute(async () => {
          throw 'String error';
        });
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('should handle async operations correctly', async () => {
      const { result } = renderHook(() => useDialogState());
      const mockFn = vi.fn().mockResolvedValue('async result');

      let returnValue;
      await act(async () => {
        returnValue = await result.current.execute(mockFn);
      });

      expect(mockFn).toHaveBeenCalled();
      expect(returnValue).toBe('async result');
    });

    it('should work with typed return values', async () => {
      const { result } = renderHook(() => useDialogState());

      interface User {
        id: number;
        name: string;
      }

      let user: User | null = null;
      await act(async () => {
        user = await result.current.execute<User>(async () => {
          return { id: 1, name: 'John' };
        });
      });

      expect(user).toEqual({ id: 1, name: 'John' });
    });
  });

  describe('reset', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setError('Some error');
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set loading to false', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setIsLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should reset both error and loading simultaneously', () => {
      const { result } = renderHook(() => useDialogState());

      act(() => {
        result.current.setIsLoading(true);
        result.current.setError('Error message');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Error message');

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('function stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useDialogState());

      const firstRender = {
        setIsLoading: result.current.setIsLoading,
        setError: result.current.setError,
        execute: result.current.execute,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.setIsLoading).toBe(firstRender.setIsLoading);
      expect(result.current.setError).toBe(firstRender.setError);
      expect(result.current.execute).toBe(firstRender.execute);
      expect(result.current.reset).toBe(firstRender.reset);
    });
  });

  describe('real-world usage patterns', () => {
    it('should handle form submission pattern', async () => {
      const { result } = renderHook(() => useDialogState());
      const onSuccess = vi.fn();

      const mockSubmit = vi.fn().mockResolvedValue({ id: 1 });

      await act(async () => {
        const submitResult = await result.current.execute(async () => {
          return mockSubmit({ name: 'Test' });
        });

        if (submitResult) {
          onSuccess(submitResult);
        }
      });

      expect(mockSubmit).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
      expect(result.current.error).toBeNull();
    });

    it('should handle delete confirmation pattern', async () => {
      const { result } = renderHook(() => useDialogState());
      const onClose = vi.fn();

      const mockDelete = vi.fn().mockResolvedValue(true);

      await act(async () => {
        const success = await result.current.execute(async () => {
          return mockDelete('item-123');
        });

        if (success) {
          onClose();
        }
      });

      expect(mockDelete).toHaveBeenCalledWith('item-123');
      expect(onClose).toHaveBeenCalled();
    });

    it('should handle retry after error pattern', async () => {
      const { result } = renderHook(() => useDialogState());

      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('Success on retry');

      // First attempt fails
      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.error).toBe('First attempt failed');

      // User clicks retry
      await act(async () => {
        await result.current.execute(mockOperation);
      });

      expect(result.current.error).toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });
});
