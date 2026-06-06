import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrCl from './CrCl';

function renderTool() {
  return render(
    <MemoryRouter>
      <CrCl />
    </MemoryRouter>,
  );
}

describe('CrCl UI', () => {
  it('renders the heading and no-PID reminder', () => {
    renderTool();
    expect(
      screen.getByRole('heading', { name: /creatinine clearance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/do not enter patient names/i)).toBeInTheDocument();
  });

  it('computes a Cockcroft–Gault estimate from inputs', () => {
    renderTool();
    fireEvent.change(screen.getByLabelText('Age (years)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Serum creatinine'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '72' } });
    // male, 90 µmol/L → 68.76 → 69 mL/min
    expect(screen.getByText('69')).toBeInTheDocument();
    expect(screen.getByText('mL/min')).toBeInTheDocument();
  });

  it('requires height when ideal body weight is selected', () => {
    renderTool();
    fireEvent.change(screen.getByLabelText('Age (years)'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('Serum creatinine'), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText('Weight (kg)'), { target: { value: '72' } });
    fireEvent.click(screen.getByRole('radio', { name: /ideal/i }));
    // Appears in both the error list and the copyable summary.
    expect(screen.getAllByText(/enter height/i).length).toBeGreaterThan(0);
  });
});
