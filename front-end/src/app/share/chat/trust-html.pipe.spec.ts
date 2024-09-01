import { TrustHTMLPipe } from '../shared/pipes/trust-html/trust-html.pipe';

describe('TrustHTMLPipe', () => {
  it('create an instance', () => {
    const pipe = new TrustHTMLPipe();
    expect(pipe).toBeTruthy();
  });
});
