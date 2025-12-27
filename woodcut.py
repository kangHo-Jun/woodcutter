from fractions import Fraction


class Lumber(object):
    """
    A piece of lumber.

    Holds:
    - Uncut length
    - list of cuts made
    """

    def __init__(self, length, fraction_limit=32):
        """
        Initalize piece of lumber
        :param length: length (ideally in inches)
        :param fraction_limit: fraction limit for denominator when converting lengths to inches
        """
        self.length = length
        self.cuts = list()
        self.fraction_limit = fraction_limit

    def length_left(self):
        """
        :return: length of lumber remaining (after subtracting committed cuts)
        """
        return self.length - sum(cut.length for cut in self.cuts)

    def add_cut(self, cut):
        """
        Add a cut to this lumber.
        Note there is no check for over-cutting
        :param cut: the cut to be added
        """
        self.cuts.append(cut)

    def __str__(self):
        """
        Return string representation of this lumber, including:
        - label (if defined) and length (in decimal and fractions) for each cut
        - remaining length of lumber left, after accounting for all committed cuts
        :return: str description
        """
        textout = '>  '
        for cut in self.cuts:
            if cut.label:
                textout += '<%s> ' % cut.label
            fraction = Fraction(cut.length).limit_denominator(self.fraction_limit)
            textout += '%2.2f' % cut.length
            textout += ' (%d %d/%d) ' % (fraction.numerator / fraction.denominator,
                                         fraction.numerator % fraction.denominator, fraction.denominator)
            textout += ' | '
        textout += '  >> %2.1f left' % self.length_left()
        return textout


def length_left(lumber):
    """
    Convenience function for calculating the length left in a piece of lumber
    :param lumber: a piece of Lumber
    :return: length remaining
    """
    return lumber.length_left()


class Cut(object):
    """
    A cut of a piece of lumber.

    Has a length, and may have a label
    """

    def __init__(self, length, label=None):
        self.length = length
        self.label = label


def cut_length(cut):
    """
    Convenience function for getting the length of a cut
    :param cut: a Cut
    :return: the length of the cut
    """
    return cut.length


class Woodcut(object):
    """
    Driver class for the woodcut optimization
    """

    def __init__(self, counts, lengths, lumber_length, lumber_name=None, labels=None):
        """
        Initialize the driver
        :param counts: [int] -> list of counts (how many of each length is required)
        :param lengths: [float] -> list of lengths for each cut, corresponding to the list of counts
        :param lumber_length: float -> length of a piece of lumber
        :param lumber_name: str -> name of this lumber
        :param labels: [str] -> list of labels, corresponding to the list of counts
        """
        self.counts = counts
        self.cuts = list()
        for i in range(len(lengths)):
            label = labels[i] if labels else None
            cut = Cut(length=round(32*lengths[i])/32, label=label)
            self.cuts.append(cut)
        self.lumber_length = lumber_length
        self.lumber_name = lumber_name
        self.labels = labels

        # create list of cuts left to do
        self.left_to_do = list()
        for i in range(len(self.counts)):
            count = self.counts[i]
            for _ in range(count):
                self.left_to_do.append(self.cuts[i])  # append 'count' times this cut

        self.lumbers = list()  # list of Lumber objects

    def add_lumber(self):
        """
        Add a new piece of lumber to the list of available lumber
        """
        lumber = Lumber(self.lumber_length)
        self.lumbers.append(lumber)

    def pick_one(self):
        """
        Pick one cut to make.

        Tries to fit the biggest cut in the biggest space first,
        then works down the list.  If no space is found, adds a new piece
        of lumber and tries again.

        Note that a cut length greater than the lumber length will result in an infinite
        loop.
        """
        self.left_to_do.sort(key=cut_length, reverse=True)  # biggest piece first
        self.lumbers.sort(key=length_left, reverse=True)  # biggest space first

        for cut in self.left_to_do:
            # try to fit this piece
            for lumber in self.lumbers:
                if cut.length <= lumber.length_left():
                    # it fits!
                    lumber.add_cut(cut)
                    self.left_to_do.remove(cut)
                    return
        # no match, need to add lumber
        self.add_lumber()
        self.pick_one()

    def solve(self):
        """
        Solve for all cuts and create the lumber cut list
        """
        while len(self.left_to_do) > 0:
            self.pick_one()

    def print_answer(self):
        """
        Print the answer found
        """
        print('\n')
        if self.lumber_name:
            print('Cuts for %s' % self.lumber_name)
        waste = 0
        for i in range(len(self.lumbers)):
            print('%d: %s' % (i+1, self.lumbers[i]))
            waste += self.lumbers[i].length_left()
        print('\nTotal waste %2.2f or %2.1f percent' % (waste, 100 * waste / (len(self.lumbers) * self.lumber_length)))


if __name__ == "__main__":
    """
    Example implementation
    """

    labels = ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'K', 'K2', 'M', 'N', 'A2', 'B2', 'C2', 'D2', 'E2', 'F2']
    counts = [6, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 3, 2, 2, 2, 6, 1]
    lengths = [7.2, 10.75, 22.25, 33.75, 45.25, 15.15, 41.94129826, 16.65, 19, 40.5, 14.5, 6.45, 33.75, 45.25,
               56.75, 68.25, 14.4]

    woodcut = Woodcut(counts, lengths, 83., lumber_name='Frame', labels=labels)
    woodcut.solve()
    woodcut.print_answer()

    counts = [6, 4, 8]
    lengths = [20, 20, 19]
    woodcut = Woodcut(counts, lengths, 83., lumber_name='Planks')
    woodcut.solve()
    woodcut.print_answer()

    labels = ['M', 'N', 'O', 'P']
    counts = [2, 2, 4, 2]
    lengths = [40.5, 14, 45.25, 14.4]
    woodcut = Woodcut(counts, lengths, 83., lumber_name='Studs', labels=labels)
    woodcut.solve()
    woodcut.print_answer()


