import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RepeatSync from './RepeatSync';

function renderTool() {
  return render(
    <MemoryRouter>
      <RepeatSync />
    </MemoryRouter>,
  );
}

async function fillRow(
  user: ReturnType<typeof userEvent.setup>,
  row: number, // 1-based, matches the visible row label
  { name, qty, dose }: { name: string; qty: string; dose: string },
) {
  await user.type(screen.getByLabelText(`Medication name, row ${row}`), name);
  await user.type(screen.getAllByLabelText('Current qty')[row - 1], qty);
  await user.type(screen.getAllByLabelText('Dose/day')[row - 1], dose);
}

describe('RepeatSync UI', () => {
  it('renders the tool heading and the no-PID reminder', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: /repeat medication synchronisation/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/do not enter patient names/i)).toBeInTheDocument();
  });

  it('computes the PRD §6.3 worked example from user input', async () => {
    const user = userEvent.setup();
    renderTool();

    // Default has two rows; add a third.
    await user.click(screen.getByRole('button', { name: /add medication/i }));

    await fillRow(user, 1, { name: 'Amlodipine 5mg', qty: '20', dose: '1' });
    await fillRow(user, 2, { name: 'Atorvastatin 40mg', qty: '35', dose: '1' });
    await fillRow(user, 3, { name: 'Ramipril 5mg', qty: '14', dose: '1' });

    // Horizon shown in the summary.
    expect(screen.getByText('35 days')).toBeInTheDocument();

    // Bridging quantities appear in the results table.
    const table = screen.getByRole('table');
    expect(within(table).getByText('15')).toBeInTheDocument(); // Amlodipine
    expect(within(table).getByText('21')).toBeInTheDocument(); // Ramipril
    expect(within(table).getByText('0')).toBeInTheDocument(); // Atorvastatin (already at H)
  });

  it('shows a per-row validation error for a zero daily dose', async () => {
    const user = userEvent.setup();
    renderTool();
    await user.type(screen.getByLabelText('Medication name, row 1'), 'Test med');
    await user.type(screen.getAllByLabelText('Dose/day')[0], '0');
    expect(screen.getByText(/daily dose must be greater than 0/i)).toBeInTheDocument();
  });

  it('rejects target-date mode with no date chosen', async () => {
    const user = userEvent.setup();
    renderTool();
    await fillRow(user, 1, { name: 'Amlodipine 5mg', qty: '20', dose: '1' });
    await user.click(screen.getByRole('radio', { name: /sync to a specific date/i }));
    // The error appears both in the results list and in the copyable summary.
    expect(screen.getAllByText(/choose a target synchronisation date/i).length).toBeGreaterThan(0);
  });

  it('offers dm+d medication suggestions via a datalist', () => {
    renderTool();
    const datalist = document.getElementById('dmd-medications');
    expect(datalist).not.toBeNull();
    const values = Array.from(datalist!.querySelectorAll('option')).map((o) => o.value);
    expect(values).toContain('Amlodipine 5mg tablets');
    expect(values.length).toBeGreaterThan(0);
  });

  it('prefills the pack size when a known dm+d medication is entered', async () => {
    const user = userEvent.setup();
    renderTool();
    await user.type(
      screen.getByLabelText('Medication name, row 1'),
      'Amlodipine 5mg tablets',
    );
    // Sample data records a single 28-unit pack for this product.
    expect(screen.getAllByLabelText('Pack size')[0]).toHaveValue(28);
  });
});
