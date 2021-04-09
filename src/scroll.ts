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
  initialDelay: number;
  maxSpeed: number;
  // scrollAreaAbsLayout: Layout
}

export const makeScrollStream = ({ initialDelay, maxSpeed }: ScrollOpts) => {
  const draggable$ = new BehaviorSubject<Layout | null>(null);

  const scrollArea$ = new BehaviorSubject<Layout | null>(null);

  const overlap$ = combineLatest([draggable$, scrollArea$])
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
        overlap = Math.ceil(overlap * 10) / 10;
        return overlap;
      }),
    )
    .pipe(distinctUntilChanged());

  const overlapping$ = overlap$
    .pipe(map((overlap) => overlap !== 0))
    .pipe(distinctUntilChanged());

  const scrollSpeed$ = overlapping$.pipe(
    switchMap((overlapping) => {
      if (!overlapping) {
        return of(0);
      }
      const accelerationTime = 1500;
      const accelerationStep = 100;
      const totalAccSteps = Math.ceil(accelerationTime/accelerationStep);
      const accelerationFactor$ = concat(
        of(-1),
        interval(accelerationStep),
      ).pipe(
        take(totalAccSteps),
        map(ind => {
            return (ind + 2) / totalAccSteps
        })
      )
      const delay$ = of(0).pipe(delay(initialDelay));

      return concat(
        delay$,
        combineLatest([overlap$, accelerationFactor$]).pipe(
          map(([overlap, accelerationFactor]) => {
              console.log('accelerationFactor', accelerationFactor)
            return overlap * maxSpeed * accelerationFactor
          }),
        ),
      );
    }),
  );

  // const scrollSpeed$ = overlap$.pipe(map((overlap) => {
  //   console.log({overlap})
  //   return maxSpeed * overlap
  // }))

  scrollSpeed$.subscribe((val) => {
    console.log('scrollSpeed$', val);
  });

  return {
    setDraggableAbsLayout: (layout: Layout) => draggable$.next(layout),
    setScrollAreaAbsLayout: (layout: Layout) => scrollArea$.next(layout),
    scrollSpeed$,
  };
};
