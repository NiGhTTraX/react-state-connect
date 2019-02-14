/* eslint-disable class-methods-use-this */
import React, { Component, ComponentType } from 'react';
import { ICommitsContainer, StateCommit } from '../commits-container';
import './commits.less';

export interface CommitProps {
  commit: StateCommit;
  disabled?: boolean; // Assume false.
}

export interface CommitsProps {
  commits: ICommitsContainer,
  Commit: ComponentType<CommitProps>
}

interface CommitsState {
  hoverCommit: StateCommit['id'];
  hoverBranch: number;
}

export default class Commits extends Component<CommitsProps, CommitsState> {
  state = {
    hoverCommit: Infinity,
    hoverBranch: this.props.commits.state.activeBranch
  };

  render() {
    return <div>
      {this.renderBranches()}
    </div>;
  }

  private renderBranches() {
    const { branches } = this.props.commits.state;

    return <ul className="branches">
      {/* eslint-disable-next-line react/no-array-index-key */}
      {branches.map((branch, i) => <li key={i}>
        {this.renderCommits(branch, i)}
      </li>)}
    </ul>;
  }

  private renderCommits(commits: StateCommit[], branch: number) {
    const { Commit } = this.props;
    const { hoverBranch, hoverCommit } = this.state;
    const head = this.props.commits.state.head || Infinity;

    const onActiveBranch = branch === hoverBranch;

    const connectedCommits: any[] = [];

    commits.forEach(commit => {
      const afterHead = hoverCommit !== Infinity
        ? commit.id > hoverCommit
        : commit.id > head;

      const disabled = onActiveBranch && afterHead;

      connectedCommits.push(
        // eslint-disable-next-line react/no-array-index-key
        <li className="commit-node" key={`commit${commit.id}`}
          onMouseOver={this.previewCheckout.bind(this, commit.id, branch)}
          onMouseLeave={this.clearCheckoutPreview}
        >
          <Commit commit={commit} disabled={disabled} />
        </li>,
        // eslint-disable-next-line react/no-array-index-key
        <li className="commit-divider" key={`divider${commit.id}`} />
      );
    });

    return <ul className="branch">
      {connectedCommits.slice(0, -1)}
    </ul>;
  }

  private previewCheckout(id: number, branch: number) {
    this.setState({ hoverCommit: id, hoverBranch: branch });
  }

  private clearCheckoutPreview = () => {
    this.setState({
      hoverCommit: Infinity,
      hoverBranch: this.props.commits.state.activeBranch
    });
  };
}
