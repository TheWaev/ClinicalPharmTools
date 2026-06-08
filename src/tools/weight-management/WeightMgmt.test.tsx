import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WeightMgmt from './WeightMgmt';

function renderTool() {
  return render(
    <MemoryRouter>
      <WeightMgmt />
    </MemoryRouter>,
  );
}

describe('Weight management eligibility UI', () => {
  it('renders the heading and no-PID reminder', () => {
    renderTool();
    expect(screen.getByRole('heading', { name: /weight management eligibility/i })).toBeInTheDocument();
    expect(screen.getByText(/do not enter patient names/i)).toBeInTheDocument();
  });

  it('shows "meets criteria" for BMI ≥40 with 4 conditions', () => {
    renderTool();
    fireEvent.change(screen.getByLabelText(/^BMI/), { target: { value: '42' } });
    fireEvent.click(screen.getByLabelText('Type 2 diabetes'));
    fireEvent.click(screen.getByLabelText('Hypertension (high blood pressure)'));
    fireEvent.click(screen.getByLabelText('Dyslipidaemia (high cholesterol)'));
    fireEvent.click(screen.getByLabelText('Obstructive sleep apnoea'));
    expect(screen.getByText(/meets eligibility criteria/i)).toBeInTheDocument();
    // Bromley (default) routes to specialist referral
    expect(screen.getByText(/refer to the specialist/i)).toBeInTheDocument();
  });

  it('excludes when pregnancy is ticked', () => {
    renderTool();
    fireEvent.change(screen.getByLabelText(/^BMI/), { target: { value: '42' } });
    fireEvent.click(screen.getByLabelText('Type 2 diabetes'));
    fireEvent.click(screen.getByLabelText('Hypertension (high blood pressure)'));
    fireEvent.click(screen.getByLabelText('Dyslipidaemia (high cholesterol)'));
    fireEvent.click(screen.getByLabelText('Obstructive sleep apnoea'));
    fireEvent.click(screen.getByLabelText(/Pregnant, planning pregnancy/i));
    expect(screen.getByText(/not eligible — excluded/i)).toBeInTheDocument();
  });
});
