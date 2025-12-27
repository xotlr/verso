import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelSearch } from '@/components/editor/panels/PanelSearch';

describe('PanelSearch', () => {
  describe('rendering', () => {
    it('should render input with placeholder', () => {
      render(<PanelSearch value="" onChange={() => {}} />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <PanelSearch
          value=""
          onChange={() => {}}
          placeholder="Search scenes..."
        />
      );
      expect(screen.getByPlaceholderText('Search scenes...')).toBeInTheDocument();
    });

    it('should render with current value', () => {
      render(<PanelSearch value="test query" onChange={() => {}} />);
      expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <PanelSearch value="" onChange={() => {}} className="custom-search" />
      );
      expect(container.firstChild).toHaveClass('custom-search');
    });

    it('should render search icon', () => {
      const { container } = render(<PanelSearch value="" onChange={() => {}} />);
      // Search icon should be present
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('onChange', () => {
    it('should call onChange when input changes', () => {
      const onChange = vi.fn();
      render(<PanelSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.change(input, { target: { value: 'new search' } });

      expect(onChange).toHaveBeenCalledWith('new search');
    });

    it('should call onChange for each character typed', () => {
      const onChange = vi.fn();
      const { rerender } = render(<PanelSearch value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText('Search...');

      fireEvent.change(input, { target: { value: 'a' } });
      expect(onChange).toHaveBeenCalledWith('a');

      rerender(<PanelSearch value="a" onChange={onChange} />);

      fireEvent.change(input, { target: { value: 'ab' } });
      expect(onChange).toHaveBeenCalledWith('ab');
    });
  });

  describe('clear button', () => {
    it('should not show clear button when value is empty', () => {
      const { container } = render(<PanelSearch value="" onChange={() => {}} />);
      // Only search icon should be present, not clear button
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should show clear button when value is not empty', () => {
      render(<PanelSearch value="search" onChange={() => {}} />);
      // Clear button should be visible
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should call onChange with empty string when clear button is clicked', () => {
      const onChange = vi.fn();
      render(<PanelSearch value="test" onChange={onChange} />);

      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should clear the input when clear button is clicked', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <PanelSearch value="search query" onChange={onChange} />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onChange).toHaveBeenCalledWith('');

      // After parent updates the value
      rerender(<PanelSearch value="" onChange={onChange} />);
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });

  describe('controlled component behavior', () => {
    it('should display the value prop', () => {
      render(<PanelSearch value="controlled value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('controlled value')).toBeInTheDocument();
    });

    it('should update display when value prop changes', () => {
      const onChange = vi.fn();
      const { rerender } = render(<PanelSearch value="first" onChange={onChange} />);

      expect(screen.getByDisplayValue('first')).toBeInTheDocument();

      rerender(<PanelSearch value="second" onChange={onChange} />);
      expect(screen.getByDisplayValue('second')).toBeInTheDocument();
    });

    it('should not modify the value without parent update', () => {
      const onChange = vi.fn();
      render(<PanelSearch value="original" onChange={onChange} />);

      const input = screen.getByDisplayValue('original');
      fireEvent.change(input, { target: { value: 'modified' } });

      // The display value stays the same (controlled)
      expect(onChange).toHaveBeenCalledWith('modified');
      // But since parent didn't update, display still shows original
      expect(screen.getByDisplayValue('original')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible input with placeholder', () => {
      render(
        <PanelSearch
          value=""
          onChange={() => {}}
          placeholder="Search characters..."
        />
      );
      expect(screen.getByPlaceholderText('Search characters...')).toBeInTheDocument();
    });

    it('should be focusable', () => {
      render(<PanelSearch value="" onChange={() => {}} />);
      const input = screen.getByPlaceholderText('Search...');
      input.focus();
      expect(document.activeElement).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string value', () => {
      render(<PanelSearch value="" onChange={() => {}} />);
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('should handle whitespace-only value', () => {
      render(<PanelSearch value="   " onChange={() => {}} />);
      // Input with whitespace - check the input exists and has value
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('   ');
      // Clear button should show for any non-empty string including whitespace
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle special characters in value', () => {
      render(<PanelSearch value="INT. HOUSE - DAY" onChange={() => {}} />);
      expect(screen.getByDisplayValue('INT. HOUSE - DAY')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      render(<PanelSearch value="café scene" onChange={() => {}} />);
      // Unicode should be preserved exactly
      expect(screen.getByDisplayValue('café scene')).toBeInTheDocument();
    });
  });
});
