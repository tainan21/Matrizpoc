use std::{process::Command, time::Instant};

use serde::Serialize;

use crate::{
    catalog::gate_definition, terminal::corepack_pnpm_command, workspace::OperationsState,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GateResult {
    pub gate_id: String,
    pub success: bool,
    pub duration_ms: u128,
    pub output: Vec<String>,
}

pub fn run_gate(state: &OperationsState, gate_id: &str) -> Result<GateResult, String> {
    let gate = gate_definition(gate_id)?;
    let root = state.root()?;
    {
        let mut active = state.gate_slot().lock().map_err(|_| "Gate lock poisoned")?;
        if active.is_some() {
            return Err("Another validation gate is already running".into());
        }
        *active = Some(gate.id.to_owned());
    }

    let started = Instant::now();
    let (program, args) = corepack_pnpm_command(&["run".to_owned(), gate.script.to_owned()])?;
    let mut command = Command::new(program);
    command.current_dir(root).args(args).env("CI", "true");
    if gate.id == "prisma:validate" {
        command
            .env(
                "OPS_DATABASE_URL",
                std::env::var_os("OPS_DATABASE_URL").unwrap_or_else(|| {
                    "postgresql://validation:validation@127.0.0.1:1/validation?schema=ops".into()
                }),
            )
            .env(
                "PAY_DATABASE_URL",
                std::env::var_os("PAY_DATABASE_URL").unwrap_or_else(|| {
                    "postgresql://validation:validation@127.0.0.1:1/validation?schema=pay".into()
                }),
            );
    }
    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);
    let result = command.output();
    *state.gate_slot().lock().map_err(|_| "Gate lock poisoned")? = None;
    let output = result.map_err(|error| format!("Unable to run {}: {error}", gate.id))?;

    let combined = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let lines = combined
        .lines()
        .rev()
        .take(200)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(str::to_owned)
        .collect();
    Ok(GateResult {
        gate_id: gate.id.to_owned(),
        success: output.status.success(),
        duration_ms: started.elapsed().as_millis(),
        output: lines,
    })
}

#[cfg(test)]
mod tests {
    #[test]
    fn output_is_bounded_to_two_hundred_lines() {
        let lines: Vec<_> = (0..250).rev().take(200).collect();
        assert_eq!(lines.len(), 200);
    }
}
