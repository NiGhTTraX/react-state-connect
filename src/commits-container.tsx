/* eslint-disable react/no-access-state-in-setstate */
import StateContainer, { attachGlobalListener, IStateContainer } from './state-container';

export interface StateCommit {
  /**
   * Self incrementing number that uniquely identifies a commit.
   *
   * Guarantees that if commit1.id < commit2.id then
   * commit1 happened before commit2.
   */
  id: number;
  state: any;
  instance: IStateContainer<any>;
  checkout: () => void;
  parent: StateCommit | null;
}

export interface TimelineState {
  branches: StateCommit[][];
  head: StateCommit['id'] | null;
  activeBranch: number;
}

export interface ICommitsContainer extends IStateContainer<TimelineState> {
  reset(): void;
}

type Snapshot = Map<StateContainer<any>, () => void>;
type SnapshotMap = Map<StateCommit['id'], Snapshot>;

class CommitsContainer extends StateContainer<TimelineState> implements ICommitsContainer {
  private commitCount = 1;

  private snapshots: SnapshotMap = new Map<StateCommit['id'], Snapshot>();

  constructor() {
    super();

    this.reset();

    attachGlobalListener(this.onSetState);
  }

  reset() {
    this.state = {
      branches: [[]],
      head: null,
      activeBranch: 0
    };

    this.snapshots.clear();
  }

  private onSetState = (state: any, checkout: () => void, instance: StateContainer<any>) => {
    // We hide updates from us. This also prevents an infinite loop.
    if (instance === this) {
      return;
    }

    const activeBranch = this.state.branches[this.state.activeBranch];
    const currentHead = this.state.head ? activeBranch[this.state.head] : null;
    const detached = this.state.head
      ? activeBranch[activeBranch.length - 1].id !== this.state.head
      : false;

    const newHead: StateCommit = {
      id: this.commitCount,
      state,
      instance,
      checkout: this.doCheckout.bind(this, this.commitCount),
      parent: currentHead
    };

    this.commitCount++;

    // Shallow clone the previous snapshot and update the key for
    // this instance. Assuming the number of instances remains small
    // this shouldn't be too expensive.
    // @ts-ignore
    const prevSnapshot: Snapshot = this.state.head
      ? this.snapshots.get(this.state.head)
      : new Map() as Snapshot;
    const newSnapshot = new Map(prevSnapshot);
    newSnapshot.set(instance, checkout);

    this.snapshots.set(newHead.id, newSnapshot);

    const newBranches = [...this.state.branches];
    let newActiveBranch = this.state.activeBranch;

    if (!detached) {
      newBranches[this.state.activeBranch] = [
        ...this.state.branches[this.state.activeBranch],
        newHead
      ];
    } else {
      newBranches.push([newHead]);
      newActiveBranch++;
    }

    this.setState({
      branches: newBranches,
      activeBranch: newActiveBranch,
      head: newHead.id
    });
  };

  private doCheckout(id: number) {
    this.setState({ head: id });

    const snapshot = this.snapshots.get(id);

    // @ts-ignore
    snapshot.forEach(checkout => checkout());
  }
}

export default new CommitsContainer();
