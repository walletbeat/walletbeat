#!/bin/bash

set -euo pipefail
set +x

if [[ -z "${GIT_USERNAME:-}" ]]; then
	echo 'Missing GIT_USERNAME' >&2
	exit 1
fi

if [[ -z "${GIT_EMAIL:-}" ]]; then
	echo 'Missing GIT_EMAIL' >&2
	exit 1
fi

if [[ -z "${GIT_SSH_SIGNING_KEY_TYPE:-}" ]]; then
	echo 'Missing GIT_SSH_SIGNING_KEY_TYPE' >&2
	exit 1
fi

if [[ -z "${GIT_SSH_SIGNING_KEY_PUBLIC:-}" ]]; then
	echo 'Missing GIT_SSH_SIGNING_KEY_PUBLIC' >&2
	exit 1
fi

if [[ -z "${GIT_SSH_SIGNING_KEY_PRIVATE:-}" ]]; then
	echo 'Missing GIT_SSH_SIGNING_KEY_PRIVATE' >&2
	exit 1
fi

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"
echo "$GIT_SSH_SIGNING_KEY_PRIVATE" > "$HOME/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}"
echo "$GIT_SSH_SIGNING_KEY_PUBLIC" > "$HOME/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}.pub"
chmod 600 "${HOME}/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}" "${HOME}/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}.pub"

git config --global user.name "$GIT_USERNAME"
git config --global user.email "$GIT_EMAIL"
git config --global gpg.format ssh
git config --global user.signingKey "${HOME}/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}.pub"
git config --global commit.gpgSign true
if [[ ! -f "${HOME}/.ssh/allowed_signers" ]] || ( ! grep -qF "${GIT_EMAIL}" "${HOME}/.ssh/allowed_signers" ); then
	echo "${GIT_EMAIL} namespaces=\"git\" $(cat "${HOME}/.ssh/id_${GIT_SSH_SIGNING_KEY_TYPE}.pub")" >> "${HOME}/.ssh/allowed_signers"
fi
git config --global gpg.ssh.allowedSignersFile "${HOME}/.ssh/allowed_signers"
