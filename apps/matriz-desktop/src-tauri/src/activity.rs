use std::{
    collections::VecDeque,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use tauri::ipc::Channel;
use uuid::Uuid;

const MAX_ACTIVITY: usize = 200;
const MAX_DETAIL_BYTES: usize = 240;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEnvelope {
    pub id: String,
    pub sequence: u64,
    pub occurred_at: u128,
    pub kind: String,
    pub severity: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_id: Option<String>,
}

#[derive(Default)]
struct ActivityState {
    sequence: u64,
    history: VecDeque<ActivityEnvelope>,
}

#[derive(Clone, Default)]
pub struct ActivityHub {
    state: Arc<Mutex<ActivityState>>,
    subscriber: Arc<Mutex<Option<Channel<ActivityEnvelope>>>>,
}

impl ActivityHub {
    pub fn publish(
        &self,
        kind: &str,
        severity: &str,
        title: &str,
        detail: Option<&str>,
        app_id: Option<&str>,
    ) {
        let mut state = match self.state.lock() {
            Ok(state) => state,
            Err(_) => return,
        };
        state.sequence += 1;
        let envelope = ActivityEnvelope {
            id: Uuid::new_v4().to_string(),
            sequence: state.sequence,
            occurred_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            kind: kind.to_owned(),
            severity: severity.to_owned(),
            title: bounded(title),
            detail: detail.map(bounded),
            app_id: app_id.map(str::to_owned),
        };
        state.history.push_back(envelope.clone());
        if state.history.len() > MAX_ACTIVITY {
            state.history.pop_front();
        }
        drop(state);
        if let Ok(subscriber) = self.subscriber.lock() {
            if let Some(channel) = subscriber.as_ref() {
                let _ = channel.send(envelope);
            }
        }
    }

    pub fn history(&self) -> Result<Vec<ActivityEnvelope>, String> {
        Ok(self
            .state
            .lock()
            .map_err(|_| "Activity lock poisoned")?
            .history
            .iter()
            .cloned()
            .collect())
    }

    pub fn subscribe(&self, channel: Channel<ActivityEnvelope>) -> Result<(), String> {
        *self
            .subscriber
            .lock()
            .map_err(|_| "Activity subscriber lock poisoned")? = Some(channel);
        Ok(())
    }
}

fn bounded(value: &str) -> String {
    if value.len() <= MAX_DETAIL_BYTES {
        return value.to_owned();
    }
    let mut end = MAX_DETAIL_BYTES;
    while !value.is_char_boundary(end) {
        end -= 1;
    }
    value[..end].to_owned()
}
