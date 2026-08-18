use std::fs;

use matriz_desktop_native::{
    app_definition, gate_definition, managed_operation, quick_target, validate_workspace,
    ManagedOperationKind,
};

#[test]
fn execution_catalog_accepts_only_known_identifiers() {
    assert_eq!(app_definition("matrizlib").expect("known app").port, 3007);
    assert_eq!(
        gate_definition("test:smoke").expect("known gate").script,
        "test:smoke"
    );
    assert!(quick_target("workspace").is_ok());
    assert!(app_definition("../../malicious").is_err());
    assert!(gate_definition("lint && whoami").is_err());
    assert!(quick_target("https://example.com").is_err());
}

#[test]
fn managed_operations_resolve_programs_and_arguments_without_shell_strings() {
    let web = managed_operation("app.seumei.web").expect("known web operation");
    assert_eq!(web.program.as_deref(), Some("pnpm.cmd"));
    assert_eq!(
        web.args,
        ["--filter", "@matriz/app-seumei", "dev"].map(str::to_owned)
    );

    let gate = managed_operation("gate.typecheck").expect("known gate operation");
    assert_eq!(gate.args, ["run", "typecheck"].map(str::to_owned));

    let build = managed_operation("app.seumei.native.build").expect("known native build");
    assert_eq!(
        build.args,
        ["--filter", "@matriz/app-seumei", "package:desktop"].map(str::to_owned)
    );
    assert_eq!(
        managed_operation("app.seumei.native.install")
            .expect("known native install")
            .kind,
        ManagedOperationKind::NativeInstall
    );
    assert!(managed_operation("app.seumei.web && whoami").is_err());
    assert!(managed_operation("pnpm arbitrary").is_err());
}

#[test]
fn workspace_requires_both_monorepo_markers() {
    let directory = tempfile::tempdir().expect("temporary workspace");
    fs::write(directory.path().join("package.json"), "{}").expect("package marker");
    assert!(validate_workspace(directory.path()).is_err());

    fs::write(directory.path().join("pnpm-workspace.yaml"), "packages: []")
        .expect("workspace marker");
    assert_eq!(
        validate_workspace(directory.path()).expect("valid workspace"),
        directory.path().canonicalize().expect("canonical fixture")
    );
}
