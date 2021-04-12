import {
  merge,
  BehaviorSubject,
  concat,
  Subject,
  of,
  interval,
  combineLatest,
} from 'rxjs';
import {
  map,
  distinctUntilChanged,
  switchMap,
  take,
  flatMap,
  mergeMap,
  delay,
} from 'rxjs/operators';

interface Position {
  x: number;
  y: number;
}

interface Layout extends Position {
  width: number;
  height: number;
}

interface ScrollOpts {
  //   initialDelay: number;
  //   maxSpeed: number;
  // scrollAreaAbsLayout: Layout
}

export const makeScrollStream = ({}: ScrollOpts) => {
  const accelerationTime = 1500;
  const accelerationStep = 100;
  const initialDelay = 300;
  const maxSpeed = 1; // px/ms
  const overlapStep = 0.05;
  const speedFactorPrec = 1 / 0.01;

  const overlapStepMult = 1 / overlapStep;

  const draggable$ = new BehaviorSubject<Layout | null>(null);

  const bottomScrollArea$ = new BehaviorSubject<Layout | null>(null);
  const topScrollArea$ = new BehaviorSubject<Layout | null>(null);


  const bottomOverlap$ = combineLatest([draggable$, bottomScrollArea$])
    .pipe(
      map(([draggable, scrollLayout]) => {
        if (!draggable || !scrollLayout) {
          return 0;
        }
        const draggableBottom = draggable.y + draggable.height;
        let overlap = draggableBottom - scrollLayout.y;
        if (overlap <= 0) {
          return 0;
        }
        overlap = overlap / scrollLayout.height;
        if (overlap >= 1) {
          overlap = 1;
        }
        // if (overlap === 1) {
        //     debugger;
        // }
        overlap = Math.ceil(overlap * overlapStepMult) / overlapStepMult;
        return overlap;
      }),
    )
    .pipe(distinctUntilChanged());

  

  const topOverlap$ = combineLatest([draggable$, topScrollArea$])
    .pipe(
      map(([draggable, scrollLayout]) => {
        if (!draggable || !scrollLayout) {
          return 0;
        }
        let overlap = scrollLayout.y + scrollLayout.height - draggable.y;
        if (overlap <= 0) {
          return 0;
        }
        overlap = overlap / scrollLayout.height;
        if (overlap >= 1) {
          overlap = 1;
        }
        overlap = Math.ceil(overlap * overlapStepMult) / overlapStepMult;
    
        return overlap;
      }),
    )
    .pipe(distinctUntilChanged());


  const overlap$ = combineLatest([topOverlap$, bottomOverlap$]).pipe(
    map(([topOverlap, bottomOverlap]) => {
        console.log({bottomOverlap, topOverlap})
      if (bottomOverlap !== 0) {
        return bottomOverlap;
      }
      return -1 * topOverlap;
    }),
  );

  const overlapping$ = overlap$
    .pipe(map((overlap) => overlap !== 0))
    .pipe(distinctUntilChanged());

  const scrollSpeed$ = overlapping$.pipe(
    switchMap((overlapping) => {
      if (!overlapping) {
        return of(0);
      }

      const totalAccSteps = Math.ceil(accelerationTime / accelerationStep);
      const accelerationFactor$ = concat(
        of(-1),
        interval(accelerationStep),
      ).pipe(
        take(totalAccSteps),
        map((ind) => {
          return (ind + 2) / totalAccSteps;
        }),
      );
      const delay$ = of(0).pipe(delay(initialDelay));

      return concat(
        delay$,
        combineLatest([overlap$, accelerationFactor$]).pipe(
          map(([overlap, accelerationFactor]) => {
            // console.log('accelerationFactor', accelerationFactor);
            let isNegative = overlap < 0 ? -1 : 1;
            let speedFactor = Math.pow(Math.abs(overlap), 1.5) * accelerationFactor;
            speedFactor =
              Math.ceil(speedFactor * speedFactorPrec) / speedFactorPrec;
            return speedFactor * maxSpeed * isNegative
          }),
        ),
      );
    }),
  );

  // const scrollSpeed$ = overlap$.pipe(map((overlap) => {
  //   console.log({overlap})
  //   return maxSpeed * overlap
  // }))

//   scrollSpeed$.subscribe((val) => {
//     console.log('scrollSpeed$', val);
//   });
  

  return {
    setDraggableAbsLayout: (layout: Layout) => draggable$.next(layout),
    setBottomScrollAreaAbsLayout: (layout: Layout) =>
      bottomScrollArea$.next(layout),
    setTopScrollAreaAbsLayout: (layout: Layout) => topScrollArea$.next(layout),
    scrollSpeed$,
  };
};
