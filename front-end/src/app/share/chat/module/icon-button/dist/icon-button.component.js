"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.IconButtonComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var button_provider_1 = require("../../utilities/button.provider");
var IconButtonComponent = /** @class */ (function () {
    function IconButtonComponent() {
        this.appRouterLink = null;
        this.src = null;
        this.type = 'icon';
        this.disabled = false;
        this.classes = 'button';
        this.icon = 'menu';
        this.color = '';
        this.clicked = new core_1.EventEmitter();
        this._loading$ = new rxjs_1.BehaviorSubject(false);
    }
    IconButtonComponent_1 = IconButtonComponent;
    Object.defineProperty(IconButtonComponent.prototype, "loading$", {
        get: function () {
            return this._loading$.asObservable();
        },
        enumerable: false,
        configurable: true
    });
    IconButtonComponent.prototype.click = function () {
        this.clicked.emit(this);
    };
    IconButtonComponent.prototype.start = function () {
        this._loading$.next(true);
    };
    IconButtonComponent.prototype.stop = function () {
        var _this = this;
        rxjs_1.of(null).pipe(operators_1.delay(300)).subscribe(function () { return _this._loading$.next(false); });
    };
    IconButtonComponent.prototype.fucus = function () {
        this.button.focus();
    };
    var IconButtonComponent_1;
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "appRouterLink");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "src");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "type");
    __decorate([
        core_1.ViewChild('button', { static: false })
    ], IconButtonComponent.prototype, "button");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "disabled");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "classes");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "icon");
    __decorate([
        core_1.Input()
    ], IconButtonComponent.prototype, "color");
    __decorate([
        core_1.Output()
    ], IconButtonComponent.prototype, "clicked");
    IconButtonComponent = IconButtonComponent_1 = __decorate([
        core_1.Component({
            selector: 'app-icon-button',
            templateUrl: './icon-button.component.html',
            styleUrls: ['./icon-button.component.scss'],
            providers: [
                {
                    provide: button_provider_1.BUTTON_LOADER,
                    useExisting: core_1.forwardRef(function () { return IconButtonComponent_1; }),
                    multi: true
                }
            ]
        })
    ], IconButtonComponent);
    return IconButtonComponent;
}());
exports.IconButtonComponent = IconButtonComponent;
