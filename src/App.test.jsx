import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders app', () => {
  render(<App />);
  expect(screen.getByTestId('app-root')).toBeInTheDocument();
});

test('input works', () => {
  render(<App />);
  const input = screen.getByTestId('chat-input');
  fireEvent.change(input, { target: { value: 'test' } });
  expect(input.value).toBe('test');
});

test('send button exists', () => {
  render(<App />);
  expect(screen.getByTestId('send-btn')).toBeInTheDocument();
});
