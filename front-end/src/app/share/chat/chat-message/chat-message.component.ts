import {
  AfterContentInit,
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ChatMessage } from '../chat/chat.component';

@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss'],
})
export class ChatMessageComponent implements OnInit, AfterContentInit {
  viewReplaySection = false;
  isReplay = false;

  @Output() replyMessage = new EventEmitter<any>();
  @Output() deletedMessage = new EventEmitter<any>();
  @Output() editMessage = new EventEmitter<any>();

  @ContentChild(ChatMessageComponent) replayedMessage: ChatMessageComponent;
  @Input() direction: 'right' | 'left' = 'left';
  @Input() message: ChatMessage | undefined;
  @Input() date = new Date();
  @Input() replyMode: boolean = false;
  @Input() role: string = 'user';
  @Input() user: any;
  constructor() {}

  ngAfterContentInit(): void {
    this.viewReplaySection = !!this.replayedMessage;
    if (this.replayedMessage) this.replayedMessage.isReplay = true;
  }
  ngOnInit(): void {
    // this.text = this.sentence();
  }

  reply() {
    this.replyMessage.emit(this.message);
  }

  sentence() {
    const nouns = [
      'bird',
      'clock',
      'boy',
      'plastic',
      'duck',
      'teacher',
      'old lady',
      'professor',
      'hamster',
      'dog',
    ];
    const verbs = [
      'kicked',
      'ran',
      'flew',
      'dodged',
      'sliced',
      'rolled',
      'died',
      'breathed',
      'slept',
      'killed',
    ];
    const adjectives = [
      'beautiful',
      'lazy',
      'professional',
      'lovely',
      'dumb',
      'rough',
      'soft',
      'hot',
      'vibrating',
      'slimy',
    ];
    const adverbs = [
      'slowly',
      'elegantly',
      'precisely',
      'quickly',
      'sadly',
      'humbly',
      'proudly',
      'shockingly',
      'calmly',
      'passionately',
    ];
    const preposition = [
      'down',
      'into',
      'up',
      'on',
      'upon',
      'below',
      'above',
      'through',
      'across',
      'towards',
    ];

    function randGen() {
      return Math.floor(Math.random() * 5);
    }

    var rand1 = Math.floor(Math.random() * 10);
    var rand2 = Math.floor(Math.random() * 10);
    var rand3 = Math.floor(Math.random() * 10);
    var rand4 = Math.floor(Math.random() * 10);
    var rand5 = Math.floor(Math.random() * 10);
    var rand6 = Math.floor(Math.random() * 10);
    var randCol = [rand1, rand2, rand3, rand4, rand5];
    var i = randGen();
    var content =
      'The ' +
      adjectives[rand1] +
      ' ' +
      nouns[rand2] +
      ' ' +
      adverbs[rand3] +
      ' ' +
      verbs[rand4] +
      ' because some ' +
      nouns[rand1] +
      ' ' +
      adverbs[rand1] +
      ' ' +
      verbs[rand1] +
      ' ' +
      preposition[rand1] +
      ' a ' +
      adjectives[rand2] +
      ' ' +
      nouns[rand5] +
      ' which, became a ' +
      adjectives[rand3] +
      ', ' +
      adjectives[rand4] +
      ' ' +
      nouns[rand6] +
      '.';

    return content;
  }
}
