import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RepeatSync from './RepeatSync';

// Decouple the UI tests from the bundled dm+d dataset, which is refreshed from
// TRUD weekly (so real pack sizes/names change). These fixtures keep the
// combobox + pack-size-prefill behaviour deterministic.
vi.mock('./dmdData', () => {
  const names = ['Amlodipine 5mg tablets', 'Ramipril 5mg capsules'];
  return {
    medicationNames: names,
    packSizesFor: (name: string) =>
      name.trim().toLowerCase() === 'amlodipine 5mg tablets' ? [28] : [],
    searchMedications: (q: string, limit = 50) => {
      const ql = q.trim().toLowerCase();
      if (ql.length < 2) return [];
      return names.filter((n) => n.toLowerCase().includes(ql)).slice(0, limit);
    },
  };
});

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

  it('surfaces dm+d suggestions via the combobox, including non-A drugs', async () => {
    const user = userEvent.setup();
    renderTool();
    const input = screen.getByLabelText('Medication name, row 1');
    // Typing a query that is not at the start of the alphabet must still match
    // (regression: the old capped datalist only showed A–drugs).
    await user.type(input, 'ramip');
    const option = await screen.findByRole('option', { name: /ramipril 5mg capsules/i });
    await user.click(within(option).getByRole('button'));
    expect(input).toHaveValue('Ramipril 5mg capsules');
  });

  it('prefills the pack size when a known dm+d medication is entered', () => {
    renderTool();
    // A single change with the full value mirrors selecting a datalist option.
    fireEvent.change(screen.getByLabelText('Medication name, row 1'), {
      target: { value: 'Amlodipine 5mg tablets' },
    });
    // Sample data records a single 28-unit pack for this product.
    expect(screen.getAllByLabelText('Pack size')[0]).toHaveValue(28);
  });
});
