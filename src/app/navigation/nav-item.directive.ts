import {
  AfterContentInit,
  Directive,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Optional,
  Output,
  Renderer2,
  SimpleChanges,
  SkipSelf
} from '@angular/core';
import { DirectionEnum, NavigationId, NavigationService } from './navigation.service';
import { CoerceBoolean } from './boolean-field';

import scrollIntoView from 'scroll-into-view-if-needed'

@Directive({
  selector: '[appNavItem]'
})
export class NavItemDirective implements OnInit, DoCheck, OnChanges, AfterContentInit {

  // Уникальный идентификатор присваиваемый элементу, чтобы на него можно было перевести фокус хоть из другой библиотеки
  // Только для удобства отладки, чтобы понимать кто виноват в цепочки передачи фокуса
  @Input() id: string;

  // Элемент на который нужно переместить фокус при нажатии вверх
  @Input() up: NavigationId;

  // Элемент на который нужно переместить фокус при нажатии вправо
  @Input() right: NavigationId;

  // Элемент на который нужно переместить фокус при нажатии вниз
  @Input() down: NavigationId;

  // Элемент на который нужно переместить фокус при нажатии влево
  @Input() left: NavigationId;

  // Спросит разрешение у переданной функции на прием фокуса
  // С помощью этого инструмента можно реализовывать удобную навигацию
  @Input() willFocus: (previousElement: HTMLElement, direction: DirectionEnum, nativeFocus: boolean) => boolean;

  // Спросит разрешение у переданной функции на потерю фокуса
  @Input() willUnFocus: (nextElement: HTMLElement, direction: DirectionEnum, nativeFocus: boolean) => boolean;

  @CoerceBoolean() @Input() focusable: boolean | string;

  @CoerceBoolean() @Input() noMemory: boolean | string;

  @CoerceBoolean() @Input() isHorizontal: boolean | string;

  @CoerceBoolean() @Input() tableId: string;

  @CoerceBoolean() @Input() nativeFocus: boolean | string;

  // Если у вас список, который нужно листать, то можете использовать эту функцию
  // Внимание! Не вешайте на все элементы, так как это лишние подсчеты
  @CoerceBoolean() @Input() needScroll: boolean | string;

  @Input() gridSize: number;

  @HostBinding('class.focused') focused: boolean;

  @Output() vFocus = new EventEmitter();

  @Output() vBlur = new EventEmitter();

  public memory: NavItemDirective;

  public doCheckEmitter = new EventEmitter()

  public children: NavItemDirective[] = [];

  constructor(
    @Optional() @SkipSelf() public parent: NavItemDirective,
    private renderer: Renderer2,
    private navigationService: NavigationService,
    public el: ElementRef<HTMLVideoElement>
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['focusable']) {
      this.tabIndexApply()
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.target === this.el.nativeElement) {
      // Не даём поставится нативному фокусу
      event.preventDefault();
      // Сами ставим свой виртуальный фокус
      if (this.focusable) {
        // NOTE: так как мы принудительно меняем фокус на этот элемент, то при последующей навигации не будет эффекта памяти
        this.navigationService.changeFocusToAnotherNavItem(this, null, true)
      } else {
        console.log('Был произведен клик на элемент, который не может иметь своего фокуса - нет аттрибута focusable')
      }
    }
  }

  @HostListener("focus")
  onFocus(): void {
    if (this.navigationService.currentNavItem !== this) {
      console.error('Элемент умудрился получить фокус без участия нашей навигации. Это очень плохо - управляйте навигацией только через сервис !!!');
      if (this.focusable) {
        this.navigationService.changeFocusToAnotherNavItem(this, null, true);
      }
    }
  }

  setFocused(value: boolean) {
    this.focused = value;
    if (this.focused) {
      if (this.nativeFocus) {
        this.el.nativeElement.focus();
      } else if (this.needScroll) {
        scrollIntoView(this.el.nativeElement, {
          scrollMode: 'if-needed',
          block: 'center',
          inline: 'center',
        })
      }
      this.renderer.addClass(this.el.nativeElement, 'focused');
      this.vFocus.emit();
    } else {
      if (this.nativeFocus) {
        this.el.nativeElement.blur();
      }
      this.renderer.removeClass(this.el.nativeElement, 'focused');
      this.vBlur.emit();
    }
  }


  findFocus(direction: DirectionEnum, native: boolean, noMemory?: boolean): NavItemDirective {

    if (this.willFocus) {
      const allowFromExternalFunction = this.willFocus(this.navigationService.currentNavItem.el.nativeElement, direction, native);
      if (!allowFromExternalFunction) {
        return null
      }
    }

    // 1. Если я элемент, который может иметь фокус, то запрошу фокус на себя
    if (this.focusable) {
      return this;
    }

    // 2. Если я родитель элементов, то возьму того ребенка, который в прошлый раз был у меня с фокусом
    if (this.memory) {
      const fromMemoryNavItem = this.children.find(navItem => navItem === this.memory);
      this.memory = undefined
      if (!noMemory) {
        console.warn('Элемент был сохранен в памяти списка, но в навигации отключен режим памяти.');
      } else if (fromMemoryNavItem) {
        const fromMemoryFindFocus = fromMemoryNavItem.findFocus(direction, native, noMemory);
        if (fromMemoryFindFocus) {
          return fromMemoryFindFocus
        } else {
          console.warn('Элемент был сохранен в памяти списка, но у него внутри нет места куда можно пристроить фокус');
        }
      } else {
        console.warn('Элемент был сохранен в памяти списка, но теперь он не является его ребенком, поэтому выбран не будет');
      }
    }

    // 3. Если я родитель элементов, то возьму первого ребенка, который его примет
    for (let i = 0; i < this.children.length; i++) {
      const findFocus = this.children[i].findFocus(direction, native, noMemory);
      if (findFocus) {
        return findFocus
      }
    }

    // 4. Фокус внутри этого элемента поставить нельзя пусть тот кто выше ищет далее
    return null
  }

  registerChild(child: NavItemDirective) {
    this.children.push(child);
  }

  unregisterChild(child: NavItemDirective) {
    const indexChild = this.children.indexOf(child);
    delete this.children[indexChild];
    this.createAutoLinks(true);
    if (child.focused) {
      this.navigationService.focusedDeleted(child, indexChild)
    }
  }

  ngDoCheck() {

  }

  ngAfterContentInit() {
    this.createAutoLinks();
    setTimeout(() => {
      this.doCheckEmitter.emit();
    })
  }

  /**
   * Создание связей в рядах, списках. По умолчанию у всех навигация вертикальная.
   */
  createAutoLinks(recreate?: boolean) {

    /**
     * Создание связи
     */
    function setLink(navItem: NavItemDirective, direction: DirectionEnum, value: NavItemDirective) {
      if (navItem[direction] && navItem[direction] !== value && !recreate && value) {
        console.warn(`Элемент ${navItem.id} является частью списка, но имеет своё фиксированное движение,` +
          ' которое противоречит списковому движению. Вы уверены что это правильное поведение? Проверьте верстку.')
      } else {
        navItem[direction] = value;
      }
    }

    // respect native tabIndex
    this.children = this.children
      .sort((a, b) => a.el.nativeElement.tabIndex - b.el.nativeElement.tabIndex);


    if (this.gridSize > 1 && this.children.length > this.gridSize) {
      const length = this.children.length;

      this.children
        .forEach((navItem, index, navItems) => {
          const upElement = (index - this.gridSize >= 0) ? navItems[index - this.gridSize] : undefined;
          const leftElement = (index !== 0) && (index % this.gridSize !== 0) ? navItems[index - 1] : undefined;
          const rightElement = (index !== navItems.length - 1) && ((index + 1) % this.gridSize !== 0) ? navItems[index + 1] : undefined;
          const downElement = (index + this.gridSize < navItems.length) ? navItems[index + this.gridSize] : undefined;
          setLink(navItem, DirectionEnum.UP, upElement)
          setLink(navItem, DirectionEnum.LEFT, leftElement)
          setLink(navItem, DirectionEnum.RIGHT, rightElement)
          setLink(navItem, DirectionEnum.DOWN, downElement)
        })

    } else {
      this.children
        .forEach((navItem, index, navItems) => {
          const prevElement = (index !== 0) ? navItems[index - 1] : undefined;
          const nextElement = (index !== navItems.length - 1) ? navItems[index + 1] : undefined;
          if (nextElement) {
            setLink(navItem, this.isHorizontal ? DirectionEnum.RIGHT : DirectionEnum.DOWN, nextElement)
          }
          if (prevElement) {
            setLink(navItem, this.isHorizontal ? DirectionEnum.LEFT : DirectionEnum.UP, prevElement)
          }
        })
    }
  }

  ngOnInit() {
    if (!this.parent) {
      this.navigationService.registerRoot(this);
    }
    if (this.parent) {
      this.parent.registerChild(this);
    }
    this.tabIndexApply()
  }

  tabIndexApply() {
    if (this.focusable) {
      if (this.el.nativeElement.tabIndex < 1) {
        this.el.nativeElement.tabIndex = 0;
      }
    } else if (this.el.nativeElement.tabIndex !== -1) {
      this.el.nativeElement.tabIndex = -1;
    }
  }

  ngOnDestroy() {
    if (this.parent) {
      this.parent.unregisterChild(this)
    }
  }

}
