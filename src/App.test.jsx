import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import App from './App';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: "Test response" } }] }),
  })
);

describe('ElectEd App', () => {
  test('renders app root', () => {
    render(<App />);
    expect(screen.getByTestId('app-root')).toBeInTheDocument();
  });

  test('renders message list', () => {
    render(<App />);
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
  });

  test('renders chat input', () => {
    render(<App />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  test('renders send button', () => {
    render(<App />);
    expect(screen.getByTestId('send-btn')).toBeInTheDocument();
  });

  test('send button disabled when input empty', () => {
    render(<App />);
    expect(screen.getByTestId('send-btn')).toBeDisabled();
  });

  test('input accepts text', () => {
    render(<App />);
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'How to vote?' } });
    expect(input.value).toBe('How to vote?');
  });

  test('send button enabled when input has text', () => {
    render(<App />);
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.getByTestId('send-btn')).not.toBeDisabled();
  });

  test('renders quick question chips', () => {
    render(<App />);
    expect(screen.getByTestId('chip-0')).toBeInTheDocument();
    expect(screen.getByTestId('chip-1')).toBeInTheDocument();
  });

  test('renders nav buttons', () => {
    render(<App />);
    expect(screen.getByLabelText('Navigate to Chat')).toBeInTheDocument();
    expect(screen.getByLabelText('Navigate to Timeline')).toBeInTheDocument();
  });

  test('welcome message shown', () => {
    render(<App />);
    expect(screen.getByTestId('bubble-assistant')).toBeInTheDocument();
  });
});
