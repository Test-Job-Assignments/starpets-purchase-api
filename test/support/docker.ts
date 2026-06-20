import { execFileSync } from 'node:child_process';

// testcontainers' StoppedTestContainer has no start() and restart() is a
// single atomic stop+start with no window to assert against the down state
// in between. Scenario 17 needs that window, so it drives the container
// directly via the Docker CLI instead.
export function stopContainer(containerId: string): void {
  execFileSync('docker', ['stop', containerId]);
}

export function startContainer(containerId: string): void {
  execFileSync('docker', ['start', containerId]);
}
