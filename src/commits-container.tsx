/* eslint-disable react/no-access-state-in-setstate */
import StateContainer, { attachGlobalListener, IStateContainer } from './state-container';

export interface StateCommit {
  id: number;
  state: any;
  instance: IStateContainer<any>;
  checkout: () => void;
  prev: StateCommit | null;
  next: StateCommit | null;
}

export interface CommitsState {
  master: StateCommit[];
  branches: StateCommit[][];
  detached: boolean;
}

export interface ICommitsContainer extends IStateContainer<CommitsState> {
  reset(): void;
}

class CommitsContainer extends StateContainer<CommitsState> implements ICommitsContainer {
  commitCount = 1;

  constructor() {
    super();

    this.reset();

    attachGlobalListener(this.onSetState);
  }

  reset() {
    this.state = {
      master: [],
      branches: [],
      detached: false
    };
  }

  private onSetState = (state: any, checkout: () => void, instance: StateContainer<any>) => {
    // We hide updates from us. This also prevents an infinite loop.
    if (instance === this) {
      return;
    }

    const currentHeadIndex = this.state.master.length - 1;
    const currentHead = this.state.master[currentHeadIndex] || null;

    const newHead: StateCommit = {
      id: this.commitCount++,
      state,
      instance,
      checkout: this.doCheckout.bind(this, checkout, currentHeadIndex),
      // TODO: handle different branches
      prev: currentHead,
      next: null
    };

    if (this.state.detached) {
      this.setState({
        branches: [...this.state.branches, [newHead]],
        detached: false
      });

      return;
    }

    this.setState({
      master: currentHead ? [
        ...this.state.master.slice(0, -1),
        { ...currentHead, next: newHead },
        newHead
      ] : [newHead]
    });
  };

  private doCheckout(checkout: () => void, i: number) {
    this.setState({ detached: true });

    let n = this.state.master[i];
    const earliestCommits = new Map<IStateContainer<any>, StateCommit>();
    const head = this.state.master[this.state.master.length - 1];

    while (n && n.next && n.next !== head) {
      if (!earliestCommits.get(n.instance)) {
        earliestCommits.set(n.instance, n);
      }

      n = n.next;
    }

    earliestCommits.forEach(c => {
      c.checkout();
    });

    checkout();
  }
}

export default new CommitsContainer();
