export class Politeness {
  map = new Map<string, boolean>();

  private register(localPeerId: string, otherPeerId: string) {
    const id = [localPeerId, otherPeerId].join();
    const revId = [otherPeerId, localPeerId].join();
    this.map.set(id, true);
    this.map.set(revId, false);

    console.debug("updated politeness map", Object.fromEntries(this.map));
  }

  get(peerId: string, otherPeerId: string): boolean {
    let p = this.map.get([peerId, otherPeerId].join());
    if (p === undefined) {
      this.register(peerId, otherPeerId);
      return this.map.get([peerId, otherPeerId].join())!;
    }
    return p;
  }
}
