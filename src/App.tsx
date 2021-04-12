import React, {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import logo from './logo.svg';
import './App.css';
import { makeScrollStream } from './scroll';

interface Layout extends Position {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}
interface Model {
  page: { height: number; width: number };
  components: Comp[];
}
interface Comp extends Position {
  id: number;

  height: number;
  width: number;
}

function Comp({
  comp,
  onNewPos,
}: {
  comp: Comp;
  onNewPos: (pos: Position, abs: Layout) => void;
}) {
  const [isCaptured, setCaptured] = useState(false);
  const onMouseDown = () => {
    setCaptured(true);
  };
  const onMouseUp = () => {
    setCaptured(false);
  };

  const draggableRef = useRef<HTMLDivElement>(null);
  const onMouseMoveRef = useRef<any>(null);
  onMouseMoveRef.current = (ev: any) => {
    if (isCaptured) {
      const rect = draggableRef.current!.getBoundingClientRect();
      const absLayout: Layout = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
      onNewPos(
        { x: comp.x + ev.movementX, y: comp.y + ev.movementY },
        absLayout,
      );
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', (ev) => {
      onMouseMoveRef.current(ev);
    });
  }, []);

  return (
    <div
      ref={draggableRef}
      style={{
        left: comp.x,
        top: comp.y,
        height: comp.height,
        width: comp.width,
      }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      // onMouseMove={onMouseMove}
      className="comp"
    ></div>
  );
}

type Action = { type: 'setNewPos'; data: { id: number; pos: Position } };

const initialModel: Model = {
  page: {
    height: 14000,
    width: 900,
  },
  components: [{ id: 1, x: 600, y: 300, width: 150, height: 80 }],
};

const modelReducer = (model: Model, action: Action): Model => {
  if (action.type === 'setNewPos') {
    return {
      ...model,
      components: model.components.map((comp) => {
        if (comp.id === action.data.id) {
          return { ...comp, ...action.data.pos };
        }
        return comp;
      }),
    };
  }
  return model;
};

const scrollAreaHeight = 100;
const ScrollArea = React.forwardRef(
  ({ className }: { className: string }, ref) => {
    return (
      <div
        ref={ref as any}
        style={{ height: scrollAreaHeight }}
        className={'scrollarea ' + className}
      ></div>
    );
  },
);

const ScrollHandler = React.memo(() => {
  // const {setNewPosition, scrollSpeed$} = React.useMemo(() => makeScrollStream(), []);

  return null;
});

const scrollTo = function (element: HTMLElement, to: number, speed: number) {
  element = document.scrollingElement as any;

  let start = element.scrollTop;

  let startTime = new Date().getTime();
  let lastAnimatedScroll: null | number = null;
  let diff = 0;

  const direction = to === 0 ? -1 : 1;

  if (to <= start * direction) {
    return null;
  }

  const animateScroll = function () {
    lastAnimatedScroll = null;
    const now = new Date().getTime();
    const offset = speed * (now - startTime) - diff;

    diff += offset;
    const newScrolltop = diff + start;
    element.scrollTop = newScrolltop;
    // console.log(toelement.scrollTop, element.scrollHeight)

    if (to <= newScrolltop * direction) {
      return;
    }
    // if (currentTime < duration) {
    // if (element.scrollTop === lastScrollTop)
    lastAnimatedScroll = requestAnimationFrame(animateScroll);
    // } else {
    //   element.scrollTop = to;
    // }
  };

  animateScroll();

  return () => {
    if (lastAnimatedScroll) {
      cancelAnimationFrame(lastAnimatedScroll);
    }
  };
};

function App() {
  const [model, action] = useReducer(modelReducer, initialModel);

  const {
    setDraggableAbsLayout,
    scrollSpeed$,
    setBottomScrollAreaAbsLayout,
    setTopScrollAreaAbsLayout,
  } = React.useMemo(
    () => makeScrollStream({}), // px/ms
    [],
  );

  const topScrollArea = useRef<HTMLDivElement>();
  const bottomScrollArea = useRef<HTMLDivElement>();
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let clean: null | (() => void) = null;

    const maxScrollY =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight -
      100;
    console.log({ maxScrollY });
    scrollSpeed$.subscribe((scrollSpeed) => {
      if (clean) {
        clean();
      }

      if (scrollSpeed !== 0) {
        const to = scrollSpeed < 0 ? 0 : maxScrollY;
        clean = scrollTo(pageRef.current!, to, scrollSpeed);
      }
    });
    const topRect = topScrollArea.current!.getBoundingClientRect();
    setTopScrollAreaAbsLayout({
      x: topRect.left,
      y: topRect.top,
      height: topRect.height,
      width: topRect.width,
    });
    const bottomRect = bottomScrollArea.current!.getBoundingClientRect();
    setBottomScrollAreaAbsLayout({
      x: bottomRect.left,
      y: bottomRect.top,
      height: bottomRect.height,
      width: bottomRect.width,
    });
  }, []);
  return (
    <div className="App">
      <ScrollArea className="top" ref={topScrollArea} />
      <ScrollArea className="bottom" ref={bottomScrollArea} />
      <ScrollHandler />
      <div
        ref={pageRef}
        style={{ height: model.page.height, width: model.page.width }}
        className="page"
      >
        {model.components.map((comp) => {
          const onNewPos = (pos: Position, abs: Layout) => {
            action({ type: 'setNewPos', data: { id: comp.id, pos } });
            setDraggableAbsLayout(abs);
          };
          return <Comp key={comp.id} comp={comp} onNewPos={onNewPos} />;
        })}
      </div>
    </div>
  );
}

export default App;
